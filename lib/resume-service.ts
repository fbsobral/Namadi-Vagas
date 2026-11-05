import "server-only";
import * as q from "./db";
import { linkedinDescription } from "./providers";
import { compactProfile, fitJob, QUICK_BATCH, quickFitBatch } from "./resume";
import type { JobFitRow } from "./resume-shared";
import { aiFlags, getAiConfig } from "./ai-config";

/* Comparação currículo x vaga, usada pelo botão da vaga, pela verificação em massa e pelo robô (vagas novas). */

// limites diários por pessoa: vêm do painel /admin
const daily = async (k: "fit" | "quickfit" | "autofit") => (await getAiConfig()).features[k].daily;

/** Texto da vaga para a IA: descrição guardada; no LinkedIn, lê a página uma vez; senão, o resumo da lista. */
async function jobForAi(userId: string, jobId: string) {
  const job = await q.getJob(userId, jobId);
  if (!job) throw new Error("Vaga não encontrada");
  let description = job.description ?? "";
  if (!description && job.source === "linkedin") {
    description = (await linkedinDescription(job.url).catch(() => null)) ?? "";
    if (description) await q.setDescription(jobId, description);
  }
  if (!description) description = job.snippet ?? "";
  if (description.trim().length < 40) throw new Error("Essa vaga não tem descrição suficiente para comparar.");
  return { title: job.title, company: job.company, location: job.location, description };
}

/** Compara (ou devolve a comparação guardada, se ainda vale para o currículo atual). `force` refaz. */
export async function computeFit(userId: string, jobId: string, opts: { force?: boolean } = {}): Promise<JobFitRow> {
  const r = await q.getResume(userId);
  if (!r) throw new Error("Envie seu currículo primeiro, na área Currículo.");
  const cur = await q.getJobFit(userId, jobId);
  // a análise completa substitui uma checagem rápida, mesmo que ela seja recente
  if (cur?.fit && !opts.force && !cur.fit.quick && cur.resume_at >= r.updated_at) return cur;
  await q.rateLimit("fit", userId, await daily("fit"), 86400_000, "Limite diário de análises completas atingido. Tente amanhã.");
  const fit = await fitJob(r.text, await jobForAi(userId, jobId));
  await q.saveJobFit(userId, jobId, fit, r.updated_at);
  return (await q.getJobFit(userId, jobId))!;
}

/**
 * Checagem rápida de várias vagas: só nota e palavras-chave, em lotes de QUICK_BATCH por chamada,
 * com o perfil compacto do currículo. Pula as que já têm nota para o currículo atual (a não ser com `force`).
 */
export async function quickFitJobs(userId: string, jobIds: string[], opts: { auto?: boolean; force?: boolean } = {}) {
  const out: Record<string, { score?: number; error?: string }> = {};
  const r = await q.getResume(userId);
  if (!r) throw new Error("Envie seu currículo primeiro, na área Currículo.");
  const profile = compactProfile(r.analysis);

  const todo: { id: string; title: string; company: string; location: string | null; text: string }[] = [];
  for (const id of [...new Set(jobIds)]) {
    const cur = await q.getJobFit(userId, id);
    if (cur?.fit && !opts.force && cur.resume_at >= r.updated_at) { out[id] = { score: cur.fit.score }; continue; }
    const job = await q.getJob(userId, id);
    if (!job) { out[id] = { error: "Vaga não encontrada" }; continue; }
    todo.push({ id, title: job.title, company: job.company, location: job.location, text: job.description || job.snippet || "" });
  }

  for (let i = 0; i < todo.length; i += QUICK_BATCH) {
    const chunk = todo.slice(i, i + QUICK_BATCH);
    try {
      if (opts.auto) await q.rateLimit("autofit", userId, await daily("autofit"), 86400_000, "Limite diário de verificações automáticas atingido.", chunk.length);
      else await q.rateLimit("quickfit", userId, await daily("quickfit"), 86400_000, "Limite diário de verificações atingido. Tente amanhã.", chunk.length);
      const fits = await quickFitBatch(profile, chunk, opts.auto ? "autofit" : "quickfit");
      for (let k = 0; k < chunk.length; k++) {
        await q.saveJobFit(userId, chunk[k].id, fits[k], r.updated_at);
        out[chunk[k].id] = { score: fits[k].score };
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : "Falhou.";
      for (const j of chunk) out[j.id] = { error };
      if (/Limite diário/.test(error)) break;
    }
  }
  return out;
}

/** Quantas verificações rápidas ainda cabem hoje. */
export async function fitQuota(userId: string) {
  const used = await q.rateUsage("quickfit", userId, 86400_000);
  const limit = await daily("quickfit");
  return { used, limit, left: Math.max(0, limit - used) };
}

/* ---------- automático: vagas novas do robô ---------- */

// Uma fila por processo: cada tarefa é "as vagas novas de uma rodada para uma pessoa" (vira 1 chamada a cada 10 vagas).
const queue: { userId: string; jobIds: string[] }[] = [];
let active = 0;
const CONCURRENCY = 2;

function pump() {
  while (active < CONCURRENCY && queue.length) {
    const t = queue.shift()!;
    active++;
    quickFitJobs(t.userId, t.jobIds, { auto: true })
      .catch((e) => console.warn("[autofit]", e instanceof Error ? e.message : e))
      .finally(() => { active--; pump(); });
  }
}

/** Enfileira as vagas novas de uma busca para quem tem currículo e deixou o automático ligado (dona e convidados). */
export async function autoFitNewJobs(searchId: string, jobIds: string[]) {
  if (!jobIds.length || !(await aiFlags()).autofit) return 0;
  const users = await q.autoFitUsers(searchId);
  for (const userId of users) queue.push({ userId, jobIds: jobIds.slice(0, 50) });
  pump();
  return users.length;
}
