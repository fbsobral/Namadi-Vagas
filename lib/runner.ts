import "server-only";
import { randomUUID } from "node:crypto";
import { claimSearch, deleteJobs, dueSearches, jobsForCleanup, jobsNeedingDescription, getSearchById, insertJob, logRun, markFiltered, markRunEnd, setDescription, setKv } from "./db";
import { googleSearch, isDemoMode } from "./serp";
import { demoJobs } from "./demo";
import { detectSource, looksLikeJob, normalizeUrl, parseTitle } from "./parse";
import { buildGoogleQuery } from "./sources";
import { evaluateJob, parseSpec, type QuerySpec } from "./query";
import { gupyFetch, linkedinDescription, linkedinFetch, type Found } from "./providers";
import { sendDigest } from "./notify";
import type { Search } from "./types";

const running = new Set<string>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Regras "excluir também na descrição": o LinkedIn não entrega o texto no card, então lemos a descrição
 * das vagas novas (com teto por rodada e pausa entre as chamadas). Vagas barradas vão para "Filtradas".
 * Se o LinkedIn limitar o ritmo (429), paramos e o resto fica para a próxima rodada.
 */
async function enrichLinkedin(searchId: string, spec: QuerySpec) {
  if (!spec.excludeBody?.length) return null;
  const pending = await jobsNeedingDescription(searchId, 20);
  let read = 0;
  let barred = 0;
  for (let i = 0; i < pending.length; i++) {
    const j = pending[i];
    try {
      if (i > 0) await sleep(2000 + Math.random() * 1200);
      const text = await linkedinDescription(j.url);
      await setDescription(j.id, text ?? "");
      read++;
      const v = evaluateJob(spec, { title: j.title, text }, { trustAny: true });
      if (v.verdict === "filtered" && v.reason) { await markFiltered(j.id, v.reason); barred++; }
    } catch {
      break; // 429: tenta de novo na próxima rodada
    }
  }
  return pending.length ? `descrições ${read}/${pending.length}${barred ? `, ${barred} filtrada(s)` : ""}` : null;
}

type Batch = { name: string; jobs: Found[]; raw: number };

/** Google (qualquer site): consulta, filtra páginas que não são de uma vaga e converte para Found. */
async function webBatch(s: Search): Promise<Batch> {
  if (isDemoMode()) {
    const r = demoJobs(s.query, s.location);
    return { name: "Demo", raw: r.length, jobs: r.map((x) => ({ ...parseTitle(x.title, x.link), url: x.link, snippet: x.snippet, source: "demo" as const })) };
  }
  const q = buildGoogleQuery(s.query, s.location, ["web"]);
  let results: Awaited<ReturnType<typeof googleSearch>> = [];
  // Até 3 páginas (~30 resultados), parando quando a página vem curta — menos requisições = menos CAPTCHA
  for (let page = 1; page <= 3; page++) {
    const r = await googleSearch(q, { recency: s.recency, page }).catch((e) => { if (page === 1) throw e; return []; });
    results = results.concat(r);
    if (r.length < 6) break;
  }
  const seen = new Set<string>();
  const jobs: Found[] = [];
  for (const r of results) {
    if (!looksLikeJob(r)) continue;
    const key = normalizeUrl(r.link);
    if (seen.has(key)) continue;
    seen.add(key);
    const { title, company, location } = parseTitle(r.title, r.link);
    jobs.push({ title, company, url: r.link, snippet: r.snippet, location: location ?? (s.location || null), source: detectSource(r.link) as Found["source"] });
  }
  return { name: "Google", jobs, raw: results.length };
}

/** Executa uma busca em todas as fontes escolhidas, deduplica e grava só o que for novo. */
export async function runSearch(searchId: string): Promise<{ added: number; total: number; error?: string }> {
  const s = await getSearchById(searchId);
  if (!s) return { added: 0, total: 0, error: "Busca não encontrada" };
  if (running.has(s.id) || !(await claimSearch(s.id))) return { added: 0, total: 0, error: "Já em execução" };

  running.add(s.id);
  const startedAt = Date.now();
  let added = 0;
  let total = 0;
  let raw = 0;
  let error: string | null = null;
  let note: string | null = null;
  let partial = false;

  try {
    // Reaplica o filtro às vagas vindas do Google (menos favoritas); as de LinkedIn/Gupy já vêm estruturadas.
    if (!isDemoMode()) {
      const old = (await jobsForCleanup(s.id)).filter((j) => !["linkedin", "gupy", "demo"].includes(j.source) || /google/i.test(j.url));
      await deleteJobs(old.filter((j) => !looksLikeJob({ title: j.title, link: j.url, snippet: j.snippet })).map((j) => j.id));
    }

    const sources = JSON.parse(s.sources) as string[];
    const spec = parseSpec(s.query_spec, s.query);
    const wantLinkedin = sources.includes("linkedin");
    const wantGupy = sources.includes("gupy");
    const wantWeb = isDemoMode() || sources.includes("web") || (!wantLinkedin && !wantGupy);

    const tasks: [string, () => Promise<Batch | { jobs: Found[]; raw: number }>][] = [];
    if (wantLinkedin && !isDemoMode()) tasks.push(["LinkedIn", () => linkedinFetch(spec, s.location, s.recency)]);
    if (wantGupy && !isDemoMode()) tasks.push(["Gupy", () => gupyFetch(spec, s.location, s.recency)]);
    if (wantWeb) tasks.push(["Google", () => webBatch(s)]);

    // Fontes em paralelo: hosts diferentes, cada uma com seu próprio ritmo
    const settled = await Promise.allSettled(tasks.map(([, fn]) => fn()));
    const parts: string[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < settled.length; i++) {
      const name = tasks[i][0];
      const r = settled[i];
      if (r.status === "rejected") {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        errors.push(`${name}: ${msg}`);
        parts.push(`${name} falhou`);
        continue;
      }
      raw += r.value.raw;
      parts.push(`${name} ${r.value.jobs.length}`);
      for (const j of r.value.jobs) {
        if (seen.has(j.url)) continue;
        seen.add(j.url);
        total++;
        const ok = await insertJob({
          id: randomUUID(),
          user_id: s.user_id,
          search_id: s.id,
          title: j.title,
          company: j.company,
          url: j.url,
          source: isDemoMode() ? "demo" : j.source,
          snippet: j.snippet,
          location: j.location ?? (s.location || null),
          description: j.description ?? null,
          filtered_reason: j.filteredReason ?? null,
        });
        if (ok && !j.filteredReason) added++;
      }
    }
    note = parts.join(" · ");
    // Só é falha da rodada se TODAS as fontes falharam; falha parcial aparece na nota.
    if (errors.length === settled.length) error = errors.join(" · ");
    else if (errors.length) { note += ` (${errors.join(" | ")})`.slice(0, 220); partial = true; }

    // Regras "na descrição": lê o texto das vagas novas do LinkedIn e manda para "Filtradas" o que for barrado
    const enr = await enrichLinkedin(s.id, spec).catch(() => null);
    if (enr) note += ` · ${enr}`;

    // Resumo por e-mail: só se esta rodada trouxe vaga nova. Falha de e-mail não derruba a rodada.
    if (!error && added > 0 && s.notify_mode === "run") {
      const m = await sendDigest(s);
      if (m.sent) note += ` · ✉ ${m.sent} no e-mail`;
      else if (m.error) note += ` · ✉ falhou: ${m.error}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    await markRunEnd(s.id, error, s.freq_minutes, partial);
    await logRun(s.id, startedAt, added, total, error, raw, note);
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
