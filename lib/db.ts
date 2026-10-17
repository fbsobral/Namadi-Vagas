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

-- buscas antigas só com Google passam a usar também os leitores diretos de LinkedIn e Gupy
UPDATE searches SET sources='["linkedin","gupy","web"]' WHERE sources='["web"]';

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contacts_note TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notified_at BIGINT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stage_pos INTEGER NOT NULL DEFAULT 0;
UPDATE jobs SET stage='todo' WHERE favorite=1 AND stage IS NULL;

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

ALTER TABLE searches ADD COLUMN IF NOT EXISTS locked_at BIGINT;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS query_spec TEXT;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS notify_mode TEXT NOT NULL DEFAULT 'off';
ALTER TABLE searches ADD COLUMN IF NOT EXISTS notify_email TEXT;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS notify_since BIGINT;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS notify_last_at BIGINT;

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at BIGINT NOT NULL
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
ALTER TABLE runs ADD COLUMN IF NOT EXISTS raw_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS note TEXT;
CREATE INDEX IF NOT EXISTS idx_runs_search ON runs(search_id, started_at DESC);
`;

const g = globalThis as unknown as { __vagasPool?: Pool; __vagasReady?: Promise<void>; __vagasSchema?: string };

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
  // Se o schema mudou (hot reload em dev), roda as migrações de novo.
  if (g.__vagasSchema !== SCHEMA) { g.__vagasSchema = SCHEMA; g.__vagasReady = undefined; }
  if (!g.__vagasReady) {
    g.__vagasReady = (async () => {
      const p = pool();
      await p.query(SCHEMA);
      // Travas de busca expiram sozinhas (STALE_LOCK_MS); só os contatos "pendentes" órfãos precisam de reset.
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

export async function insertSearch(s: Omit<Search, "last_run_at" | "last_status" | "last_error" | "created_at" | "next_run_at" | "notify_since" | "notify_last_at">) {
  const now = Date.now();
  await run(
    `INSERT INTO searches (id,user_id,name,query,query_spec,location,sources,recency,freq_minutes,active,color,next_run_at,created_at,notify_mode,notify_email,notify_since)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    s.id, s.user_id, s.name, s.query, s.query_spec, s.location, s.sources, s.recency, s.freq_minutes, s.active, s.color, now, now,
    s.notify_mode, s.notify_email, s.notify_mode === "off" ? null : now,
  );
}

export async function updateSearch(userId: string, id: string, s: Pick<Search, "name" | "query" | "query_spec" | "location" | "sources" | "recency" | "freq_minutes">) {
  const cur = await getSearch(userId, id);
  if (!cur) return;
  const next = cur.active ? (cur.last_run_at ?? Date.now()) + s.freq_minutes * 60000 : cur.next_run_at;
  await run(
    "UPDATE searches SET name=?, query=?, query_spec=?, location=?, sources=?, recency=?, freq_minutes=?, next_run_at=? WHERE id=? AND user_id=?",
    s.name, s.query, s.query_spec, s.location, s.sources, s.recency, s.freq_minutes, next, id, userId,
  );
}

export const setSearchActive = (userId: string, id: string, active: boolean) =>
  active
    ? run("UPDATE searches SET active=1, next_run_at=? WHERE id=? AND user_id=?", Date.now(), id, userId)
    : run("UPDATE searches SET active=0 WHERE id=? AND user_id=?", id, userId);

export const deleteSearch = (userId: string, id: string) =>
  run("DELETE FROM searches WHERE id=? AND user_id=?", id, userId);

export const STALE_LOCK_MS = 15 * 60_000;

export const dueSearches = (now: number) =>
  all<Search>(
    `SELECT * FROM searches WHERE active=1 AND next_run_at IS NOT NULL AND next_run_at <= ?
       AND (last_status != 'running' OR locked_at IS NULL OR locked_at < ?)`,
    now, now - STALE_LOCK_MS,
  );

/** Trava atômica no banco: só uma instância ganha. Trava velha (processo morreu) é reassumida. */
export async function claimSearch(id: string) {
  const now = Date.now();
  const r = await run(
    `UPDATE searches SET last_status='running', locked_at=?, last_error=NULL
     WHERE id=? AND (last_status != 'running' OR locked_at IS NULL OR locked_at < ?)`,
    now, id, now - STALE_LOCK_MS,
  );
  return (r.rowCount ?? 0) > 0;
}

/** Em caso de erro tenta de novo logo (no máx. 30 min); em caso de sucesso espera a frequência escolhida. */
export function markRunEnd(id: string, error: string | null, freqMinutes: number, retrySoon = false) {
  const now = Date.now();
  const wait = error || retrySoon ? Math.min(freqMinutes, 30) : freqMinutes;
  return run(
    "UPDATE searches SET last_status=?, last_error=?, last_run_at=?, next_run_at=?, locked_at=NULL WHERE id=?",
    error ? "error" : "ok", error, now, now + wait * 60000, id,
  );
}

export type RunRow = { id: number; started_at: number; finished_at: number | null; new_count: number; total_count: number; raw_count: number; note: string | null; error: string | null };
export const listRuns = (searchId: string, limit = 8) =>
  all<RunRow>("SELECT id, started_at, finished_at, new_count, total_count, raw_count, note, error FROM runs WHERE search_id=? ORDER BY started_at DESC LIMIT " + Number(limit), searchId);

/* ---------- sinal de vida ---------- */

export const setKv = (key: string, value: string) =>
  run("INSERT INTO kv (key,value,updated_at) VALUES (?,?,?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at", key, value, Date.now());
export const getKv = (key: string) => get<{ value: string; updated_at: number }>("SELECT value, updated_at FROM kv WHERE key=?", key);

export const logRun = (searchId: string, startedAt: number, newCount: number, total: number, error: string | null, raw = 0, note: string | null = null) =>
  run("INSERT INTO runs (search_id,started_at,finished_at,new_count,total_count,raw_count,note,error) VALUES (?,?,?,?,?,?,?,?)",
    searchId, startedAt, Date.now(), newCount, total, raw, note, error);

/* ---------- e-mail (resumo das vagas novas) ---------- */

export type DigestJob = Pick<Job, "id" | "title" | "company" | "location" | "source" | "url" | "found_at">;

/** Liga/desliga o resumo. Ao ligar, só vagas encontradas daqui para frente entram (sem despejar o histórico). */
export async function setNotify(userId: string, id: string, mode: Search["notify_mode"], email: string | null) {
  const cur = await getSearch(userId, id);
  if (!cur) return;
  const since = mode === "off" ? cur.notify_since : cur.notify_mode === "off" ? Date.now() : cur.notify_since;
  await run("UPDATE searches SET notify_mode=?, notify_email=?, notify_since=? WHERE id=? AND user_id=?", mode, mode === "off" ? cur.notify_email : email, since, id, userId);
}

export const disableNotify = (id: string) => run("UPDATE searches SET notify_mode='off' WHERE id=?", id);

/** Reserva (atômico) as vagas ainda não avisadas: duas execuções nunca mandam a mesma vaga duas vezes. */
export async function claimUnnotified(searchId: string, since: number, limit = 200) {
  await ready();
  const r = await pool().query(
    `UPDATE jobs SET notified_at=$1 WHERE id IN (
       SELECT id FROM jobs WHERE search_id=$2 AND notified_at IS NULL AND found_at >= $3 ORDER BY found_at DESC LIMIT $4
     ) RETURNING id, title, company, location, source, url, found_at`,
    [Date.now(), searchId, since, limit],
  );
  return (r.rows as DigestJob[]).sort((a, b) => b.found_at - a.found_at);
}

export const unclaimJobs = async (ids: string[]) => {
  if (ids.length) await run(`UPDATE jobs SET notified_at=NULL WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids);
};

export const dueDigests = (boundary: number) =>
  all<Search>("SELECT * FROM searches WHERE notify_mode='daily' AND notify_email IS NOT NULL AND (notify_last_at IS NULL OR notify_last_at < ?)", boundary);

export const touchNotifyLast = (id: string) => run("UPDATE searches SET notify_last_at=? WHERE id=?", Date.now(), id);

export const countUnnotified = async (searchId: string, since: number) =>
  (await get<{ n: number }>("SELECT COUNT(*) AS n FROM jobs WHERE search_id=? AND notified_at IS NULL AND found_at >= ?", searchId, since))?.n ?? 0;

/* ---------- jobs ---------- */

export type JobFilter = "all" | "new" | "fav" | "board";

export function listJobs(userId: string, opts: { searchId?: string | null; filter: JobFilter; limit?: number }) {
  const where = ["j.user_id = ?"];
  const params: P[] = [userId];
  if (opts.searchId) { where.push("j.search_id = ?"); params.push(opts.searchId); }
  if (opts.filter === "new") where.push("j.seen = 0");
  if (opts.filter === "fav") where.push("j.favorite = 1");
  if (opts.filter === "board") where.push("j.stage IS NOT NULL");
  const order = opts.filter === "fav" ? "j.favorited_at DESC" : opts.filter === "board" ? "j.stage_pos ASC, j.favorited_at DESC" : "j.found_at DESC, j.id DESC";
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

export async function setFavorite(userId: string, id: string, fav: boolean) {
  if (!fav) {
    await run("UPDATE jobs SET favorite=0, favorited_at=NULL, stage=NULL, seen=1 WHERE id=? AND user_id=?", id, userId);
    return;
  }
  // favoritar = querer se candidatar: entra no fim da primeira coluna do kanban
  await run(
    `UPDATE jobs SET favorite=1, favorited_at=?, seen=1,
       stage = COALESCE(stage, 'todo'),
       stage_pos = CASE WHEN stage IS NULL THEN COALESCE((SELECT MAX(stage_pos)+1 FROM jobs WHERE user_id=? AND stage='todo'), 0) ELSE stage_pos END
     WHERE id=? AND user_id=?`,
    Date.now(), userId, id, userId,
  );
}

/** Move uma vaga para uma etapa, na posição `index`, renumerando a coluna destino. */
export async function moveJob(userId: string, id: string, stage: string, index: number) {
  await ready();
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const own = await c.query("SELECT 1 FROM jobs WHERE id=$1 AND user_id=$2 AND favorite=1", [id, userId]);
    if (!own.rowCount) throw new Error("Vaga não encontrada");
    const col = (await c.query("SELECT id FROM jobs WHERE user_id=$1 AND stage=$2 AND id<>$3 ORDER BY stage_pos ASC, favorited_at DESC", [userId, stage, id])).rows.map((r) => r.id as string);
    col.splice(Math.min(Math.max(index, 0), col.length), 0, id);
    for (let i = 0; i < col.length; i++) {
      await c.query("UPDATE jobs SET stage_pos=$1, stage=$2 WHERE id=$3", [i, stage, col[i]]);
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export const jobsForCleanup = (searchId: string) =>
  all<Pick<Job, "id" | "title" | "url" | "snippet" | "source">>("SELECT id, title, url, snippet, source FROM jobs WHERE search_id=? AND favorite=0", searchId);
export const deleteJobs = async (ids: string[]) => {
  if (ids.length) await run(`DELETE FROM jobs WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids);
};

export const markSeen = (userId: string, id: string) => run("UPDATE jobs SET seen=1 WHERE id=? AND user_id=?", id, userId);

export const markAllSeen = (userId: string, searchId: string | null) =>
  searchId
    ? run("UPDATE jobs SET seen=1 WHERE user_id=? AND search_id=?", userId, searchId)
    : run("UPDATE jobs SET seen=1 WHERE user_id=?", userId);

export const setContactsStatus = (id: string, status: Job["contacts_status"], error: string | null = null, note: string | null = null) =>
  run("UPDATE jobs SET contacts_status=?, contacts_error=?, contacts_note=? WHERE id=?", status, error, note, id);

/** Reserva a busca de contatos (idempotência): só quem muda o status para "pending" executa. */
export async function claimContacts(userId: string, id: string, force = false) {
  const r = await run(
    `UPDATE jobs SET contacts_status='pending', contacts_error=NULL
     WHERE id=? AND user_id=? AND contacts_status != 'pending' ${force ? "" : "AND contacts_status != 'done'"}`,
    id, userId,
  );
  return (r.rowCount ?? 0) > 0;
}

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
