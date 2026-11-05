// Catálogo dos recursos de IA e dos modelos (client-safe). A configuração salva fica em lib/ai-config.ts.

export const AI_MODELS = [
  { id: "claude-fable-5-1", label: "Claude Fable 5.1", hint: "o mais capaz de todos", input: 10, output: 50 },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "o mais capaz", input: 4, output: 20 },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: "equilíbrio", input: 2, output: 10 },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", hint: "o mais barato e rápido", input: 0.1, output: 0.5 },
] as const;
export type AiModel = (typeof AI_MODELS)[number]["id"];

const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined);

export const AI_FEATURES = [
  { key: "cv_fill", label: "Preencher busca com o currículo", where: "Editor de busca", when: "Quando a pessoa envia o currículo ao criar uma busca", model: () => (env("AI_MODEL_CV") || "claude-sonnet-5-5") as AiModel, daily: () => Number(env("CV_DAILY_LIMIT") || 10) },
  { key: "resume", label: "Análise de currículo", where: "Currículo", when: "Ao enviar o currículo e ao tocar em Reanalisar", model: () => (env("AI_MODEL_RESUME") || "claude-opus-5-5") as AiModel, daily: () => Number(env("RESUME_DAILY_LIMIT") || 8) },
  { key: "refine", label: "Refinar sugestão com a IA", where: "Currículo › sugestões", when: "Quando a pessoa acrescenta um ponto a uma sugestão e pede para refinar", model: () => (env("AI_MODEL_RESUME") || "claude-opus-5-5") as AiModel, daily: () => 30 },
  { key: "fit", label: "Compatibilidade completa", where: "Detalhes da vaga", when: "Ao pedir a análise completa de uma vaga (dicas e currículo adaptado)", model: () => (env("AI_MODEL_RESUME") || "claude-opus-5-5") as AiModel, daily: () => Number(env("FIT_DAILY_LIMIT") || 40) },
  { key: "quickfit", label: "Checagem rápida", where: "Currículo › lista de vagas", when: "Ao verificar uma ou várias vagas na lista (10 vagas por chamada)", model: () => (env("AI_MODEL_QUICKFIT") || "claude-haiku-5-5") as AiModel, daily: () => Number(env("QUICK_FIT_DAILY_LIMIT") || 300) },
  { key: "autofit", label: "Checagem automática de vagas novas", where: "Robô", when: "A cada rodada com vaga nova, para quem tem currículo e deixou ligado", model: () => (env("AI_MODEL_QUICKFIT") || "claude-haiku-5-5") as AiModel, daily: () => Number(env("AUTO_FIT_DAILY_LIMIT") || 200) },
  { key: "letter", label: "Carta de apresentação", where: "Detalhes da vaga", when: "Ao tocar em Gerar carta", model: () => (env("AI_MODEL_RESUME") || "claude-opus-5-5") as AiModel, daily: () => 20 },
  { key: "company", label: "Classificação de empresas", where: "Robô (segmentos da busca)", when: "Para empresas ainda não classificadas, em buscas com filtro de segmento", model: () => "claude-haiku-5-5" as AiModel, daily: () => 500 },
] as const;
export type AiFeature = (typeof AI_FEATURES)[number]["key"];

export type AiFeatureConfig = { enabled: boolean; model: AiModel; daily: number };
export type AiConfig = { enabled: boolean; features: Record<AiFeature, AiFeatureConfig> };
export type AiFlags = Record<AiFeature, boolean>;

/** Custo estimado em US$ (preço de tabela, sem descontos de cache). */
export function estimateCost(model: string, input: number, output: number) {
  const m = AI_MODELS.find((x) => x.id === model);
  if (!m) return 0;
  return (input * m.input + output * m.output) / 1_000_000;
}
