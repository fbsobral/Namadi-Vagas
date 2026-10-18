import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
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
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS filtered INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS filtered_reason TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS filter_keep INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stage_pos INTEGER NOT NULL DEFAULT 0;
UPDATE jobs SET stage='todo' WHERE favorite=1 AND stage IS NULL;

CREATE TABLE IF NOT EXISTS search_members (
  id TEXT PRIMARY KEY,
  search_id TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by TEXT NOT NULL,
  inviter_name TEXT,
  member_name TEXT,
  token TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  accepted_at BIGINT,
  UNIQUE(search_id, email)
);
CREATE INDEX IF NOT EXISTS idx_members_email ON search_members(email);
CREATE INDEX IF NOT EXISTS idx_members_user ON search_members(user_id);

-- estado PESSOAL de cada vaga (favorito, etapa do kanban, visto): cada pessoa tem o seu
CREATE TABLE IF NOT EXISTS job_user (
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  favorite INTEGER NOT NULL DEFAULT 0,
  favorited_at BIGINT,
  seen INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  stage_pos INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (job_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_job_user_user ON job_user(user_id);

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
      // Migração única: favorito/etapa/visto saem da vaga e passam a ser por pessoa (o dono herda o que já tinha).
      if (!(await p.query("SELECT 1 FROM kv WHERE key='migrated_job_user'")).rowCount) {
        await p.query(`INSERT INTO job_user (job_id,user_id,favorite,favorited_at,seen,stage,stage_pos)
          SELECT id,user_id,favorite,favorited_at,seen,stage,stage_pos FROM jobs WHERE favorite=1 OR seen=1 OR stage IS NOT NULL
          ON CONFLICT DO NOTHING`);
        await p.query("INSERT INTO kv (key,value,updated_at) VALUES ('migrated_job_user','1',$1) ON CONFLICT (key) DO NOTHING", [Date.now()]);
      }
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

/** Acesso a uma busca: é a dona, ou foi convidada e aceitou. Usa 2 parâmetros: (userId, userId). */
const ACCESS = `(s.user_id = ? OR EXISTS (SELECT 1 FROM search_members m WHERE m.search_id = s.id AND m.user_id = ? AND m.status = 'accepted'))`;

export const listSearches = (userId: string) =>
  all<Search>(
    `SELECT s.*, (s.user_id = ?) AS is_owner,
       (SELECT m.inviter_name FROM search_members m WHERE m.search_id = s.id AND m.user_id = ? AND m.status = 'accepted') AS owner_name,
       (SELECT COUNT(*) FROM search_members m WHERE m.search_id = s.id AND m.status = 'accepted') AS shared_count,
       (SELECT COUNT(*) FROM jobs j WHERE j.search_id = s.id AND j.filtered = 0) AS total,
       (SELECT COUNT(*) FROM jobs j LEFT JOIN job_user u ON u.job_id = j.id AND u.user_id = ? WHERE j.search_id = s.id AND j.filtered = 0 AND COALESCE(u.seen, 0) = 0) AS unseen,
       (SELECT COUNT(*) FROM jobs j JOIN job_user u ON u.job_id = j.id AND u.user_id = ? WHERE j.search_id = s.id AND j.filtered = 0 AND u.favorite = 1) AS favs
     FROM searches s WHERE ${ACCESS} ORDER BY (s.user_id = ?) DESC, s.created_at ASC`,
    userId, userId, userId, userId, userId, userId, userId,
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
       SELECT id FROM jobs WHERE search_id=$2 AND notified_at IS NULL AND filtered=0 AND found_at >= $3 ORDER BY found_at DESC LIMIT $4
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

export type JobFilter = "all" | "new" | "fav" | "board" | "filtered";

const JOB_COLS = `j.*, s.name AS search_name, s.color AS search_color, (s.user_id = ?) AS is_owner,
       COALESCE(u.favorite, 0) AS favorite, u.favorited_at AS favorited_at, COALESCE(u.seen, 0) AS seen, u.stage AS stage, COALESCE(u.stage_pos, 0) AS stage_pos`;
const JOB_FROM = `FROM jobs j JOIN searches s ON s.id = j.search_id LEFT JOIN job_user u ON u.job_id = j.id AND u.user_id = ?`;

export function listJobs(userId: string, opts: { searchId?: string | null; filter: JobFilter; limit?: number }) {
  const where = [ACCESS];
  const params: P[] = [userId, userId, userId, userId]; // is_owner, join, acesso(2)
  if (opts.searchId) { where.push("j.search_id = ?"); params.push(opts.searchId); }
  where.push(opts.filter === "filtered" ? "j.filtered = 1" : "j.filtered = 0");
  if (opts.filter === "new") where.push("COALESCE(u.seen, 0) = 0");
  if (opts.filter === "fav") where.push("u.favorite = 1");
  if (opts.filter === "board") where.push("u.stage IS NOT NULL");
  const order = opts.filter === "fav" ? "u.favorited_at DESC" : opts.filter === "board" ? "u.stage_pos ASC, u.favorited_at DESC" : "j.found_at DESC, j.id DESC";
  return all<Job>(`SELECT ${JOB_COLS} ${JOB_FROM} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ${Number(opts.limit ?? 120)}`, ...params);
}

/** Quantas vagas de cada busca estão no quadro (kanban) desta pessoa. */
export async function boardCounts(userId: string) {
  const rows = await all<{ id: string; n: number }>(
    `SELECT j.search_id AS id, COUNT(*) AS n FROM jobs j JOIN searches s ON s.id = j.search_id
     JOIN job_user u ON u.job_id = j.id AND u.user_id = ?
     WHERE u.stage IS NOT NULL AND j.filtered = 0 AND ${ACCESS} GROUP BY j.search_id`,
    userId, userId, userId,
  );
  return Object.fromEntries(rows.map((r) => [r.id, Number(r.n)])) as Record<string, number>;
}

export async function jobCounts(userId: string) {
  return (await get<{ total: number; unseen: number; favs: number }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN COALESCE(u.seen, 0) = 0 THEN 1 ELSE 0 END), 0) AS unseen,
            COALESCE(SUM(CASE WHEN COALESCE(u.favorite, 0) = 1 THEN 1 ELSE 0 END), 0) AS favs
     FROM jobs j JOIN searches s ON s.id = j.search_id LEFT JOIN job_user u ON u.job_id = j.id AND u.user_id = ?
     WHERE j.filtered = 0 AND ${ACCESS}`,
    userId, userId, userId,
  ))!;
}

export const getJob = (userId: string, id: string) =>
  get<Job>(`SELECT ${JOB_COLS} ${JOB_FROM} WHERE j.id = ? AND ${ACCESS}`, userId, userId, id, userId, userId); // is_owner, join, id, acesso(2)

export const getJobById = (id: string) => get<Job>("SELECT * FROM jobs WHERE id=?", id);

export async function insertJob(j: Pick<Job, "id" | "user_id" | "search_id" | "title" | "company" | "url" | "source" | "snippet" | "location"> & { description?: string | null; filtered_reason?: string | null }) {
  const r = await run(
    `INSERT INTO jobs (id,user_id,search_id,title,company,url,source,snippet,location,found_at,description,filtered,filtered_reason)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (search_id, url) DO NOTHING`,
    j.id, j.user_id, j.search_id, j.title, j.company, j.url, j.source, j.snippet, j.location, Date.now(),
    j.description ?? null, j.filtered_reason ? 1 : 0, j.filtered_reason ?? null,
  );
  return (r.rowCount ?? 0) > 0;
}

/** Favoritar/desfavoritar é pessoal. Quem chama já checou o acesso à vaga (getJob). */
export async function setFavorite(userId: string, id: string, fav: boolean) {
  if (!fav) {
    await run(
      `INSERT INTO job_user (job_id, user_id, favorite, seen) VALUES (?, ?, 0, 1)
       ON CONFLICT (job_id, user_id) DO UPDATE SET favorite = 0, favorited_at = NULL, stage = NULL, seen = 1`,
      id, userId,
    );
    return;
  }
  // favoritar = querer se candidatar: entra no fim da primeira coluna do kanban de quem favoritou
  await run(
    `INSERT INTO job_user (job_id, user_id, favorite, favorited_at, seen, stage, stage_pos)
     VALUES (?, ?, 1, ?, 1, 'todo', (SELECT COALESCE(MAX(stage_pos) + 1, 0) FROM job_user WHERE user_id = ? AND stage = 'todo'))
     ON CONFLICT (job_id, user_id) DO UPDATE SET favorite = 1, favorited_at = EXCLUDED.favorited_at, seen = 1,
       stage = COALESCE(job_user.stage, 'todo'),
       stage_pos = CASE WHEN job_user.stage IS NULL THEN EXCLUDED.stage_pos ELSE job_user.stage_pos END`,
    id, userId, Date.now(), userId,
  );
}

/** Move uma vaga para uma etapa do kanban DESTA pessoa, na posição `index`, renumerando a coluna destino. */
export async function moveJob(userId: string, id: string, stage: string, index: number) {
  await ready();
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const own = await c.query("SELECT 1 FROM job_user WHERE job_id=$1 AND user_id=$2 AND favorite=1", [id, userId]);
    if (!own.rowCount) throw new Error("Vaga não encontrada");
    const col = (await c.query("SELECT job_id FROM job_user WHERE user_id=$1 AND stage=$2 AND job_id<>$3 ORDER BY stage_pos ASC, favorited_at DESC", [userId, stage, id])).rows.map((r) => r.job_id as string);
    col.splice(Math.min(Math.max(index, 0), col.length), 0, id);
    for (let i = 0; i < col.length; i++) {
      await c.query("UPDATE job_user SET stage_pos=$1, stage=$2 WHERE job_id=$3 AND user_id=$4", [i, stage, col[i], userId]);
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/* ---------- descrição e filtradas ---------- */

export const setDescription = (id: string, text: string) => run("UPDATE jobs SET description=? WHERE id=?", text, id);

/** Vagas do LinkedIn ainda sem descrição lida (as mais novas primeiro), para checar regras "na descrição". */
export const jobsNeedingDescription = (searchId: string, limit: number) =>
  all<Pick<Job, "id" | "title" | "url">>(
    "SELECT id, title, url FROM jobs WHERE search_id=? AND source='linkedin' AND description IS NULL AND filter_keep=0 ORDER BY found_at DESC LIMIT " + Number(limit),
    searchId,
  );

export const markFiltered = (id: string, reason: string) => run("UPDATE jobs SET filtered=1, filtered_reason=? WHERE id=? AND filter_keep=0", reason, id);

/** "Manter na lista": só a dona da busca. Desfaz o filtro e impede que ele volte a barrar essa vaga. */
export const keepJob = (userId: string, id: string) =>
  run("UPDATE jobs SET filtered=0, filtered_reason=NULL, filter_keep=1 WHERE id=? AND search_id IN (SELECT id FROM searches WHERE user_id=?)", id, userId);

export async function filteredCount(userId: string, searchId: string | null) {
  const r = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM jobs j JOIN searches s ON s.id = j.search_id WHERE j.filtered = 1 AND ${ACCESS}${searchId ? " AND j.search_id = ?" : ""}`,
    ...(searchId ? [userId, userId, searchId] : [userId, userId]),
  );
  return r?.n ?? 0;
}

export const jobsForCleanup = (searchId: string) =>
  all<Pick<Job, "id" | "title" | "url" | "snippet" | "source">>("SELECT id, title, url, snippet, source FROM jobs WHERE search_id=? AND NOT EXISTS (SELECT 1 FROM job_user u WHERE u.job_id = jobs.id AND u.favorite = 1)", searchId);
export const deleteJobs = async (ids: string[]) => {
  if (ids.length) await run(`DELETE FROM jobs WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids);
};

export const markSeen = (userId: string, id: string) =>
  run("INSERT INTO job_user (job_id, user_id, seen) VALUES (?, ?, 1) ON CONFLICT (job_id, user_id) DO UPDATE SET seen = 1", id, userId);

export const markAllSeen = (userId: string, searchId: string | null) =>
  run(
    `INSERT INTO job_user (job_id, user_id, seen)
     SELECT j.id, ?, 1 FROM jobs j JOIN searches s ON s.id = j.search_id WHERE ${ACCESS}${searchId ? " AND j.search_id = ?" : ""}
     ON CONFLICT (job_id, user_id) DO UPDATE SET seen = 1`,
    ...(searchId ? [userId, userId, userId, searchId] : [userId, userId, userId]),
  );

export const setContactsStatus = (id: string, status: Job["contacts_status"], error: string | null = null, note: string | null = null) =>
  run("UPDATE jobs SET contacts_status=?, contacts_error=?, contacts_note=? WHERE id=?", status, error, note, id);

/** Reserva a busca de contatos (idempotência): só quem muda o status para "pending" executa. */
export async function claimContacts(_userId: string, id: string, force = false) {
  // Contatos são públicos e valem para a vaga toda (quem tem acesso à vaga os vê); o acesso já foi checado.
  const r = await run(
    `UPDATE jobs SET contacts_status='pending', contacts_error=NULL
     WHERE id=? AND contacts_status != 'pending' ${force ? "" : "AND contacts_status != 'done'"}`,
    id,
  );
  return (r.rowCount ?? 0) > 0;
}

/* ---------- compartilhamento ---------- */

export type Member = {
  id: string; search_id: string; email: string; user_id: string | null; status: "pending" | "accepted";
  inviter_name: string | null; member_name: string | null; token: string; created_at: number; accepted_at: number | null;
};
export type PendingInvite = Member & { search_name: string; search_color: string };

export const listMembers = (ownerId: string, searchId: string) =>
  all<Member>(
    `SELECT m.* FROM search_members m JOIN searches s ON s.id = m.search_id WHERE m.search_id = ? AND s.user_id = ? ORDER BY m.created_at ASC`,
    searchId, ownerId,
  );

/** Convida um e-mail para ver a busca. Só a dona convida. Reconvidar um pendente devolve o mesmo convite. */
export async function inviteMember(ownerId: string, searchId: string, email: string, inviterName: string | null) {
  const search = await getSearch(ownerId, searchId);
  if (!search) throw new Error("Busca não encontrada");
  const e = email.trim().toLowerCase();
  const cur = await get<Member>("SELECT * FROM search_members WHERE search_id = ? AND email = ?", searchId, e);
  if (cur?.status === "accepted") throw new Error("Essa pessoa já tem acesso a esta busca.");
  if (cur) return { member: cur, created: false };
  const member: Member = {
    id: randomUUID(), search_id: searchId, email: e, user_id: null, status: "pending",
    inviter_name: inviterName, member_name: null, token: randomBytes(18).toString("base64url"), created_at: Date.now(), accepted_at: null,
  };
  await run(
    "INSERT INTO search_members (id, search_id, email, status, invited_by, inviter_name, token, created_at) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)",
    member.id, searchId, e, ownerId, inviterName, member.token, member.created_at,
  );
  return { member, created: true };
}

export const removeMember = (ownerId: string, memberId: string) =>
  run("DELETE FROM search_members WHERE id = ? AND search_id IN (SELECT id FROM searches WHERE user_id = ?)", memberId, ownerId);

export const leaveSearch = (userId: string, searchId: string) =>
  run("DELETE FROM search_members WHERE search_id = ? AND user_id = ?", searchId, userId);

export async function pendingInvitesFor(emails: string[]) {
  if (!emails.length) return [] as PendingInvite[];
  await ready();
  const r = await pool().query(
    `SELECT m.*, s.name AS search_name, s.color AS search_color FROM search_members m JOIN searches s ON s.id = m.search_id
     WHERE m.status = 'pending' AND m.email = ANY($1) ORDER BY m.created_at DESC`,
    [emails],
  );
  return r.rows as PendingInvite[];
}

export const inviteByToken = (token: string) =>
  get<PendingInvite>(
    `SELECT m.*, s.name AS search_name, s.color AS search_color FROM search_members m JOIN searches s ON s.id = m.search_id WHERE m.token = ?`,
    token,
  );

/** Aceita um convite pendente — só vale se o e-mail do convite for um dos e-mails verificados de quem aceita. */
export async function acceptInvite(userId: string, emails: string[], by: { id?: string; token?: string }, name: string | null) {
  await ready();
  const r = await pool().query(
    `UPDATE search_members SET status = 'accepted', user_id = $1, member_name = $2, accepted_at = $3
     WHERE status = 'pending' AND email = ANY($4) AND ${by.id ? "id = $5" : "token = $5"} RETURNING search_id`,
    [userId, name, Date.now(), emails, by.id ?? by.token],
  );
  return r.rows[0]?.search_id as string | undefined;
}

export async function declineInvite(emails: string[], memberId: string) {
  await ready();
  await pool().query("DELETE FROM search_members WHERE id = $1 AND status = 'pending' AND email = ANY($2)", [memberId, emails]);
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
