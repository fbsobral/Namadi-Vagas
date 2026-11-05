import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import * as q from "./db";
import { aiFeature, trackUsage } from "./ai-config";
import { companyKey, INDUSTRIES, MODELS, segmentMiss, SIZES, type CompanyInfo, type Segments } from "./segments";

/*
 * Classifica empresas (modelo de negócio, setor, porte) para os segmentos das buscas.
 * Cada empresa é classificada UMA vez e fica em cache (tabela companies); várias por chamada, no modelo mais barato.
 */

const BATCH = 25;
let client: Anthropic | null = null;
const ai = () => (client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 }));

const Out = z.object({
  companies: z.array(z.object({
    n: z.number(),
    model: z.enum(["b2b", "b2c", "b2b2c", "unknown"]),
    industry: z.enum([...INDUSTRIES.map((i) => i.key as string), "unknown"] as unknown as [string, ...string[]]),
    size: z.enum([...SIZES.map((s) => s.key as string), "unknown"] as unknown as [string, ...string[]]),
  })),
});

const SYSTEM = `Classifique cada empresa (mercado brasileiro e global) pelo que você sabe dela.
model: b2b (vende para empresas), b2c (para pessoas), b2b2c (os dois de forma relevante).
industry: ${INDUSTRIES.map((i) => i.key).join(", ")}.
size (funcionários no mundo): startup (até 50), small (51-200), medium (201-1000), large (1001-10000), enterprise (10000+).
Se não conhecer a empresa ou não tiver certeza de um campo, use "unknown" nesse campo. Não chute.`;

async function classifyBatch(names: string[]): Promise<(CompanyInfo | null)[]> {
  const { model } = await aiFeature("company");
  let usage: Anthropic.Usage | null = null;
  try {
    const res = await ai().messages.parse({
      model,
      max_tokens: 2000,
      ...(model.startsWith("claude-haiku") ? { thinking: { type: "disabled" as const } } : {}),
      system: SYSTEM,
      messages: [{ role: "user", content: names.map((n, i) => `${i + 1}. ${n}`).join("\n") }],
      output_config: { format: zodOutputFormat(Out), effort: "low" },
    });
    usage = res.usage;
    trackUsage("company", model, usage, res.stop_reason === "refusal");
    const out = res.parsed_output?.companies ?? [];
    return names.map((_, i) => {
      const c = out.find((x) => Math.round(x.n) === i + 1);
      if (!c) return null;
      const known = <T extends string>(v: string, list: readonly { key: T }[]) => (list.some((x) => x.key === v) ? (v as T) : null);
      return { model: known(c.model, MODELS), industry: known(c.industry, INDUSTRIES), size: known(c.size, SIZES) };
    });
  } catch (e) {
    if (!usage) trackUsage("company", model, null, true);
    throw e;
  }
}

/** Garante a classificação das empresas (cache primeiro). Devolve o mapa nome→classificação; o que falhar fica de fora. */
export async function ensureCompanies(ownerId: string, names: string[]) {
  // a mesma empresa pode vir escrita de jeitos diferentes ("Stone", "stone"): manda para a IA a grafia mais "nome próprio"
  const caps = (n: string) => (n.match(/\p{Lu}/gu) ?? []).length;
  const byKey = new Map<string, string>();
  for (const raw of names) {
    const n = raw.trim();
    if (!n) continue;
    const k = companyKey(n);
    const cur = byKey.get(k);
    if (!cur || caps(n) > caps(cur)) byKey.set(k, n);
  }
  const cached = await q.getCompanies([...byKey.keys()]);
  const missing = [...byKey.entries()].filter(([k]) => !cached.has(k));
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    try {
      const cfg = await aiFeature("company");
      await q.rateLimit("company", ownerId, cfg.daily, 86400_000, "Limite diário de classificação de empresas atingido.", chunk.length);
      const res = await classifyBatch(chunk.map(([, n]) => n));
      for (let k = 0; k < chunk.length; k++) {
        const r = res[k];
        if (!r) continue;
        const row = { key: chunk[k][0], name: chunk[k][1], model: r.model, industry: r.industry, size: r.size };
        await q.saveCompany(row);
        cached.set(row.key, row);
      }
    } catch (e) {
      console.warn("[companies]", e instanceof Error ? e.message : e);
      break; // recurso desligado, limite ou falha: segue sem segmentar o resto (na dúvida, a vaga fica)
    }
  }
  return cached;
}

const info = (c: q.CompanyRow | undefined): CompanyInfo | null =>
  c ? { model: c.model as CompanyInfo["model"], industry: c.industry as CompanyInfo["industry"], size: c.size as CompanyInfo["size"] } : null;

/**
 * Aplica os segmentos às vagas da busca: barra (vai para Filtradas, com o motivo) as de empresas fora do segmento
 * e devolve à lista as que foram barradas por segmento e agora cabem. Vagas "mantidas" à mão não são tocadas.
 * `classify=false` usa só o cache (sem IA), para aplicar na hora ao salvar a busca.
 */
export async function applySegments(searchId: string, ownerId: string, seg: Segments | undefined, opts: { classify?: boolean; onlyIds?: string[] } = {}) {
  let jobs = await q.jobsForSegments(searchId);
  if (opts.onlyIds) { const only = new Set(opts.onlyIds); jobs = jobs.filter((j) => only.has(j.id)); }
  const names = [...new Set(jobs.map((j) => j.company))];
  const companies = opts.classify ? await ensureCompanies(ownerId, names) : await q.getCompanies(names.map(companyKey));
  const barred: string[] = [];
  let restored = 0;
  for (const j of jobs) {
    const miss = segmentMiss(seg, info(companies.get(companyKey(j.company))));
    const bySegment = j.filtered === 1 && (j.filtered_reason ?? "").startsWith("segmento:");
    if (miss && j.filtered === 0) { await q.markFiltered(j.id, miss); barred.push(j.id); }
    else if (!miss && bySegment) { await q.unfilterJob(j.id); restored++; }
  }
  return { barred, restored };
}
