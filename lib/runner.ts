import "server-only";
import { randomUUID } from "node:crypto";
import { claimSearch, deleteJobs, dueSearches, jobsForCleanup, getSearchById, insertJob, logRun, markRunEnd, setKv } from "./db";
import { googleSearch, isDemoMode } from "./serp";
import { demoJobs } from "./demo";
import { detectSource, looksLikeJob, normalizeUrl, parseTitle } from "./parse";
import { buildGoogleQuery } from "./sources";

const running = new Set<string>();

/** Executa uma busca: consulta o Google, filtra, deduplica e grava só o que for novo. */
export async function runSearch(searchId: string): Promise<{ added: number; total: number; error?: string }> {
  const s = await getSearchById(searchId);
  if (!s) return { added: 0, total: 0, error: "Busca não encontrada" };
  if (running.has(s.id) || !(await claimSearch(s.id))) return { added: 0, total: 0, error: "Já em execução" };

  running.add(s.id);
  const startedAt = Date.now();
  // Reaplica o filtro às vagas antigas (menos as favoritas): remove lixo que entrou antes de o filtro ficar estrito.
  if (!isDemoMode()) {
    const old = await jobsForCleanup(s.id);
    await deleteJobs(old.filter((j) => !looksLikeJob({ title: j.title, link: j.url, snippet: j.snippet })).map((j) => j.id));
  }
  let added = 0;
  let total = 0;
  let error: string | null = null;

  try {
    const sources = JSON.parse(s.sources) as string[];
    const q = buildGoogleQuery(s.query, s.location, sources);
    let results: Awaited<ReturnType<typeof googleSearch>>;
    if (isDemoMode()) {
      results = demoJobs(s.query, s.location);
    } else {
      // 2ª página só se a 1ª veio cheia — menos requisições = menos chance de CAPTCHA
      results = await googleSearch(q, { recency: s.recency, page: 1 });
      if (results.length >= 8) results = results.concat(await googleSearch(q, { recency: s.recency, page: 2 }).catch(() => []));
    }

    const seen = new Set<string>();
    for (const r of results) {
      if (!looksLikeJob(r)) continue;
      const url = isDemoMode() ? r.link : normalizeUrl(r.link);
      if (seen.has(url)) continue;
      seen.add(url);
      total++;
      const { title, company, location } = parseTitle(r.title, r.link);
      const ok = await insertJob({
        id: randomUUID(),
        user_id: s.user_id,
        search_id: s.id,
        title,
        company,
        url: r.link,
        source: isDemoMode() ? "demo" : detectSource(r.link),
        snippet: r.snippet,
        location: location ?? (s.location || null),
      });
      if (ok) added++;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    await markRunEnd(s.id, error, s.freq_minutes);
    await logRun(s.id, startedAt, added, total, error);
    running.delete(s.id);
  }
  return { added, total, ...(error ? { error } : {}) };
}

/** Roda tudo que está vencido. Chamado pelo agendador interno e por /api/cron. */
export async function runDue() {
  const due = await dueSearches(Date.now());
  const out: { id: string; added: number; error?: string }[] = [];
  for (const s of due) {
    const r = await runSearch(s.id);
    out.push({ id: s.id, added: r.added, error: r.error });
  }
  return out;
}

/** Sinal de vida: o painel avisa se o agendador parar de bater. */
export const beat = () => setKv("scheduler_heartbeat", String(process.pid));
