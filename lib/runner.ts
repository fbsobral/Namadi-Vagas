import "server-only";
import { randomUUID } from "node:crypto";
import { dueSearches, getSearchById, insertJob, logRun, markRunEnd, markRunStart } from "./db";
import { googleSearch, isDemoMode } from "./serp";
import { demoJobs } from "./demo";
import { detectSource, looksLikeJob, normalizeUrl, parseTitle } from "./parse";
import { buildGoogleQuery } from "./sources";

const running = new Set<string>();

/** Executa uma busca: consulta o Google, filtra, deduplica e grava só o que for novo. */
export async function runSearch(searchId: string): Promise<{ added: number; total: number; error?: string }> {
  const s = await getSearchById(searchId);
  if (!s) return { added: 0, total: 0, error: "Busca não encontrada" };
  if (running.has(s.id)) return { added: 0, total: 0, error: "Já em execução" };

  running.add(s.id);
  await markRunStart(s.id);
  const startedAt = Date.now();
  let added = 0;
  let total = 0;
  let error: string | null = null;

  try {
    const sources = JSON.parse(s.sources) as string[];
    const q = buildGoogleQuery(s.query, s.location, sources);
    const results = isDemoMode()
      ? demoJobs(s.query, s.location)
      : (await Promise.all([1, 2].map((page) => googleSearch(q, { recency: s.recency, page }).catch((e) => (page === 1 ? Promise.reject(e) : []))))).flat();

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
