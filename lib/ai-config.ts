import "server-only";
import { getKv, logAiUsage, setKv } from "./db";
import { AI_FEATURES, AI_MODELS, type AiConfig, type AiFeature, type AiFlags } from "./ai-shared";

/*
 * Configuração da IA, editada pelo admin em /admin: chave geral, e por recurso: ligado, modelo e limite diário por pessoa.
 * Fica no kv ("ai:config") com cache curto em memória; o padrão vale para o que nunca foi salvo.
 */

const KEY = "ai:config";
const TTL = 20_000;
const g = globalThis as unknown as { __aiCfg?: { at: number; cfg: AiConfig } };

export function defaultConfig(): AiConfig {
  return {
    enabled: true,
    features: Object.fromEntries(AI_FEATURES.map((f) => [f.key, { enabled: true, model: f.model(), daily: f.daily() }])) as AiConfig["features"],
  };
}

export async function getAiConfig(): Promise<AiConfig> {
  if (g.__aiCfg && Date.now() - g.__aiCfg.at < TTL) return g.__aiCfg.cfg;
  const def = defaultConfig();
  let saved: Partial<AiConfig> = {};
  try { saved = JSON.parse((await getKv(KEY))?.value ?? "{}"); } catch { /* config corrompida: usa o padrão */ }
  const cfg: AiConfig = {
    enabled: saved.enabled !== false,
    features: Object.fromEntries(AI_FEATURES.map((f) => {
      const s = saved.features?.[f.key];
      const model = s?.model && AI_MODELS.some((m) => m.id === s.model) ? s.model : def.features[f.key].model;
      const daily = Number.isFinite(s?.daily) && (s?.daily ?? 0) >= 0 ? Math.round(s!.daily) : def.features[f.key].daily;
      return [f.key, { enabled: s?.enabled !== false, model, daily }];
    })) as AiConfig["features"],
  };
  g.__aiCfg = { at: Date.now(), cfg };
  return cfg;
}

export async function saveAiConfig(cfg: AiConfig) {
  await setKv(KEY, JSON.stringify(cfg));
  g.__aiCfg = undefined;
}

export const aiKeyConfigured = () => !!process.env.ANTHROPIC_API_KEY;

/** O que cada tela pode mostrar (seguro para mandar ao navegador). */
export async function aiFlags(): Promise<AiFlags> {
  const cfg = await getAiConfig();
  const on = aiKeyConfigured() && cfg.enabled;
  return Object.fromEntries(AI_FEATURES.map((f) => [f.key, on && cfg.features[f.key].enabled])) as AiFlags;
}

export class AiDisabledError extends Error {
  status = 403;
}

/** Garante que o recurso está ligado e devolve modelo e limite. */
export async function aiFeature(key: AiFeature) {
  const cfg = await getAiConfig();
  if (!aiKeyConfigured()) throw new AiDisabledError("A IA ainda não está configurada no servidor (ANTHROPIC_API_KEY).");
  if (!cfg.enabled || !cfg.features[key].enabled) throw new AiDisabledError("Este recurso de IA está desligado pelo administrador.");
  return cfg.features[key];
}

/** Registra o consumo de uma chamada (falhas de registro nunca derrubam o recurso). */
export function trackUsage(feature: AiFeature, model: string, usage: { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null } | null, error = false) {
  const input = (usage?.input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0);
  logAiUsage(feature, model, input, usage?.output_tokens ?? 0, error).catch(() => {});
}
