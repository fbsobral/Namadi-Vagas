import "server-only";
import { Pool, types } from "pg";
import type { Contact, Job, Search } from "./types";

// BIGINT (timestamps em ms) e COUNT() voltam como número em vez de string.
types.setTypeParser(20, (v) => Number(v));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  sources TEXT NOT NULL DEFAULT '["web"]',
  recency TEXT NOT NULL DEFAULT 'week',
  freq_minutes INTEGER NOT NULL DEFAULT 360,
  active INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL DEFAULT '#E8501F',
  last_run_at BIGINT,
  next_run_at BIGINT,
  last_status TEXT NOT NULL DEFAULT 'idle',
  last_error TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_searches_user ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_due ON searches(active, next_run_at);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  search_id TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  snippet TEXT NOT NULL DEFAULT '',
  location TEXT,
  found_at BIGINT NOT NULL,
  favorite INTEGER NOT NULL DEFAULT 0,
  favorited_at BIGINT,
  seen INTEGER NOT NULL DEFAULT 0,
  contacts_status TEXT NOT NULL DEFAULT 'idle',
  contacts_error TEXT,
  UNIQUE(search_id, url)
);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id, found_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs(search_id, found_at DESC);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  snippet TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'peer',
  score INTEGER NOT NULL DEFAULT 0,
  found_at BIGINT NOT NULL,
  UNIQUE(job_id, url)
);

CREATE TABLE IF NOT EXISTS runs (
  id BIGSERIAL PRIMARY KEY,
  search_id TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  started_at BIGINT NOT NULL,
  finished_at BIGINT,
  new_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
`;

const g = globalThis as unknown as { __vagasPool?: Pool; __vagasReady?: Promise<void> };

function pool(): Pool {
  if (!g.__vagasPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não definida (ex.: postgres://user:pass@host:5432/db)");
    g.__vagasPool = new Pool({
      connectionString: url,
      max: 10,
      ssl: process.env.DATABASE_SSL === "1" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return g.__vagasPool;
}

async function ready() {
  if (!g.__vagasReady) {
    g.__vagasReady = (async () => {
      const p = pool();
      await p.query(SCHEMA);
      // Execuções que ficaram "em andamento" por causa de um restart nunca terminariam sozinhas.
      await p.query("UPDATE searches SET last_status='idle' WHERE last_status='running'");
      await p.query("UPDATE jobs SET contacts_status='error', contacts_error='Interrompido' WHERE contacts_status='pending'");
    })().catch((e) => {
      g.__vagasReady = undefined;
      throw e;
    });
  }
  return g.__vagasReady;
}

type P = string | number | null;

// Aceita "?" como placeholder e converte para $1, $2...
const sql = (q: string) => { let i = 0; return q.replace(/\?/g, () => `$${++i}`); };

async function all<T>(q: string, ...p: P[]) {
  await ready();
  return (await pool().query(sql(q), p)).rows as T[];
}
async function get<T>(q: string, ...p: P[]) {
  return (await all<T>(q, ...p))[0] ?? null;
}
async function run(q: string, ...p: P[]) {
  await ready();
  return pool().query(sql(q), p);
}

/* ---------- searches ---------- */

export const listSearches = (userId: string) =>
  all<Search>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM jobs j WHERE j.search_id = s.id) AS total,
       (SELECT COUNT(*) FROM jobs j WHERE j.search_id = s.id AND j.seen = 0) AS unseen,
       (SELECT COUNT(*) FROM jobs j WHERE j.search_id = s.id AND j.favorite = 1) AS favs
     FROM searches s WHERE s.user_id = ? ORDER BY s.created_at ASC`,
    userId,
  );

export const getSearch = (userId: string, id: string) =>
  get<Search>("SELECT * FROM searches WHERE id = ? AND user_id = ?", id, userId);

export const getSearchById = (id: string) => get<Search>("SELECT * FROM searches WHERE id = ?", id);

export async function insertSearch(s: Omit<Search, "last_run_at" | "last_status" | "last_error" | "created_at" | "next_run_at">) {
  const now = Date.now();
  await run(
    `INSERT INTO searches (id,user_id,name,query,location,sources,recency,freq_minutes,active,color,next_run_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    s.id, s.user_id, s.name, s.query, s.location, s.sources, s.recency, s.freq_minutes, s.active, s.color, now, now,
  );
}

export async function updateSearch(userId: string, id: string, s: Pick<Search, "name" | "query" | "location" | "sources" | "recency" | "freq_minutes">) {
  const cur = await getSearch(userId, id);
  if (!cur) return;
  const next = cur.active ? (cur.last_run_at ?? Date.now()) + s.freq_minutes * 60000 : cur.next_run_at;
  await run(
    "UPDATE searches SET name=?, query=?, location=?, sources=?, recency=?, freq_minutes=?, next_run_at=? WHERE id=? AND user_id=?",
    s.name, s.query, s.location, s.sources, s.recency, s.freq_minutes, next, id, userId,
  );
}

export const setSearchActive = (userId: string, id: string, active: boolean) =>
  active
    ? run("UPDATE searches SET active=1, next_run_at=? WHERE id=? AND user_id=?", Date.now(), id, userId)
    : run("UPDATE searches SET active=0 WHERE id=? AND user_id=?", id, userId);

export const deleteSearch = (userId: string, id: string) =>
  run("DELETE FROM searches WHERE id=? AND user_id=?", id, userId);

export const dueSearches = (now: number) =>
  all<Search>("SELECT * FROM searches WHERE active=1 AND last_status != 'running' AND next_run_at IS NOT NULL AND next_run_at <= ?", now);

export const markRunStart = (id: string) => run("UPDATE searches SET last_status='running', last_error=NULL WHERE id=?", id);

export function markRunEnd(id: string, error: string | null, freqMinutes: number) {
  const now = Date.now();
  return run(
    "UPDATE searches SET last_status=?, last_error=?, last_run_at=?, next_run_at=? WHERE id=?",
    error ? "error" : "ok", error, now, now + freqMinutes * 60000, id,
  );
}

export const logRun = (searchId: string, startedAt: number, newCount: number, total: number, error: string | null) =>
  run("INSERT INTO runs (search_id,started_at,finished_at,new_count,total_count,error) VALUES (?,?,?,?,?,?)",
    searchId, startedAt, Date.now(), newCount, total, error);

/* ---------- jobs ---------- */

export type JobFilter = "all" | "new" | "fav";

export function listJobs(userId: string, opts: { searchId?: string | null; filter: JobFilter; limit?: number }) {
  const where = ["j.user_id = ?"];
  const params: P[] = [userId];
  if (opts.searchId) { where.push("j.search_id = ?"); params.push(opts.searchId); }
  if (opts.filter === "new") where.push("j.seen = 0");
  if (opts.filter === "fav") where.push("j.favorite = 1");
  const order = opts.filter === "fav" ? "j.favorited_at DESC" : "j.found_at DESC, j.id DESC";
  return all<Job>(
    `SELECT j.*, s.name AS search_name, s.color AS search_color FROM jobs j
     JOIN searches s ON s.id = j.search_id WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ${Number(opts.limit ?? 120)}`,
    ...params,
  );
}

export async function jobCounts(userId: string) {
  return (await get<{ total: number; unseen: number; favs: number }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN seen=0 THEN 1 ELSE 0 END),0) AS unseen,
            COALESCE(SUM(CASE WHEN favorite=1 THEN 1 ELSE 0 END),0) AS favs
     FROM jobs WHERE user_id=?`,
    userId,
  ))!;
}

export const getJob = (userId: string, id: string) =>
  get<Job>(
    `SELECT j.*, s.name AS search_name, s.color AS search_color FROM jobs j
     JOIN searches s ON s.id=j.search_id WHERE j.id=? AND j.user_id=?`,
    id, userId,
  );

export const getJobById = (id: string) => get<Job>("SELECT * FROM jobs WHERE id=?", id);

export async function insertJob(j: Pick<Job, "id" | "user_id" | "search_id" | "title" | "company" | "url" | "source" | "snippet" | "location">) {
  const r = await run(
    `INSERT INTO jobs (id,user_id,search_id,title,company,url,source,snippet,location,found_at)
     VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT (search_id, url) DO NOTHING`,
    j.id, j.user_id, j.search_id, j.title, j.company, j.url, j.source, j.snippet, j.location, Date.now(),
  );
  return (r.rowCount ?? 0) > 0;
}

export const setFavorite = (userId: string, id: string, fav: boolean) =>
  run("UPDATE jobs SET favorite=?, favorited_at=?, seen=1 WHERE id=? AND user_id=?", fav ? 1 : 0, fav ? Date.now() : null, id, userId);

export const markSeen = (userId: string, id: string) => run("UPDATE jobs SET seen=1 WHERE id=? AND user_id=?", id, userId);

export const markAllSeen = (userId: string, searchId: string | null) =>
  searchId
    ? run("UPDATE jobs SET seen=1 WHERE user_id=? AND search_id=?", userId, searchId)
    : run("UPDATE jobs SET seen=1 WHERE user_id=?", userId);

export const setContactsStatus = (id: string, status: Job["contacts_status"], error: string | null = null) =>
  run("UPDATE jobs SET contacts_status=?, contacts_error=? WHERE id=?", status, error, id);

/* ---------- contacts ---------- */

export const listContacts = (jobId: string) =>
  all<Contact>(
    `SELECT * FROM contacts WHERE job_id=? ORDER BY CASE role WHEN 'recruiter' THEN 0 WHEN 'leader' THEN 1 ELSE 2 END, score DESC`,
    jobId,
  );

export const clearContacts = (jobId: string) => run("DELETE FROM contacts WHERE job_id=?", jobId);

export const insertContact = (c: Omit<Contact, "found_at">) =>
  run(
    `INSERT INTO contacts (id,job_id,user_id,name,headline,url,snippet,role,score,found_at) VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT (job_id, url) DO NOTHING`,
    c.id, c.job_id, c.user_id, c.name, c.headline, c.url, c.snippet, c.role, c.score, Date.now(),
  );
