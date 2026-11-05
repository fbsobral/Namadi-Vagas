import "server-only";
import { after } from "next/server";
import { createAiJob, failAiJob, finishAiJob, type AiJob } from "./db";

/**
 * Roda uma análise de IA depois de responder ao navegador: a pessoa pode trocar de tela ou fechar o app
 * que o servidor termina e guarda o resultado. O aviso flutuante do painel acompanha pelo /api/jobs.
 * Validações e limites devem ser feitos ANTES (para o erro aparecer na hora).
 */
export async function startAiJob(userId: string, kind: AiJob["kind"], label: string, refId: string | null, work: () => Promise<{ id: string | null; note?: string | null }>) {
  const jobId = await createAiJob(userId, kind, label, refId);
  after(async () => {
    try {
      const r = await work();
      await finishAiJob(jobId, r.id, r.note ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não consegui terminar a análise.";
      console.warn("[job]", kind, msg);
      await failAiJob(jobId, msg).catch(() => {});
    }
  });
  return jobId;
}

/** Texto curto do resultado: "Nota 84 (+6)". */
export const scoreNote = (score: number, before?: number | null) =>
  `Nota ${score}${before != null && before !== score ? ` (${score > before ? "+" : ""}${score - before})` : ""}`;
