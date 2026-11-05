// Segmentos de empresa para filtrar buscas (client-safe): modelo de negócio, setor e porte.

export const MODELS = [
  { key: "b2b", label: "B2B", hint: "vende para empresas" },
  { key: "b2c", label: "B2C", hint: "vende para pessoas" },
  { key: "b2b2c", label: "B2B2C", hint: "os dois" },
] as const;

export const SIZES = [
  { key: "startup", label: "Startup", hint: "até 50 pessoas" },
  { key: "small", label: "Pequena", hint: "51–200" },
  { key: "medium", label: "Média", hint: "201–1.000" },
  { key: "large", label: "Grande", hint: "1.001–10.000" },
  { key: "enterprise", label: "Gigante", hint: "10.000+" },
] as const;

export const INDUSTRIES = [
  { key: "software", label: "Software e SaaS" },
  { key: "fintech", label: "Fintech e serviços financeiros" },
  { key: "ecommerce", label: "Varejo e e-commerce" },
  { key: "health", label: "Saúde e bem-estar" },
  { key: "education", label: "Educação" },
  { key: "consumer", label: "Alimentos e bens de consumo" },
  { key: "industry", label: "Indústria e manufatura" },
  { key: "agro", label: "Agronegócio" },
  { key: "logistics", label: "Logística e mobilidade" },
  { key: "media", label: "Mídia, games e entretenimento" },
  { key: "agency", label: "Consultoria e agências" },
  { key: "telecom", label: "Telecom e infraestrutura" },
  { key: "energy", label: "Energia e utilities" },
  { key: "realestate", label: "Imobiliário e construção" },
  { key: "travel", label: "Turismo e hotelaria" },
  { key: "hr", label: "RH e recrutamento" },
  { key: "public", label: "Governo, ONG e terceiro setor" },
] as const;

export type BizModel = (typeof MODELS)[number]["key"];
export type Size = (typeof SIZES)[number]["key"];
export type Industry = (typeof INDUSTRIES)[number]["key"];

export type Segments = { models?: BizModel[]; industries?: Industry[]; sizes?: Size[] };
export type CompanyInfo = { model: BizModel | null; industry: Industry | null; size: Size | null };

export const hasSegments = (s?: Segments | null) => !!s && !!((s.models?.length ?? 0) + (s.industries?.length ?? 0) + (s.sizes?.length ?? 0));

const pick = <T extends string>(arr: unknown, allowed: readonly { key: T }[], max: number): T[] =>
  Array.isArray(arr) ? [...new Set(arr.filter((x): x is T => allowed.some((a) => a.key === x)))].slice(0, max) : [];

export function cleanSegments(s: unknown): Segments | undefined {
  const o = (s ?? {}) as Segments;
  const out: Segments = { models: pick(o.models, MODELS, 3), industries: pick(o.industries, INDUSTRIES, INDUSTRIES.length), sizes: pick(o.sizes, SIZES, 5) };
  return hasSegments(out) ? out : undefined;
}

export const modelLabel = (k: string | null) => MODELS.find((m) => m.key === k)?.label ?? null;
export const sizeLabel = (k: string | null) => SIZES.find((m) => m.key === k)?.label ?? null;
export const industryLabel = (k: string | null) => INDUSTRIES.find((m) => m.key === k)?.label ?? null;

/**
 * Motivo para barrar a empresa, ou null se ela cabe no segmento.
 * O que a IA não soube dizer (null) nunca barra: na dúvida, a vaga fica.
 * B2B2C conta como B2B e como B2C.
 */
export function segmentMiss(seg: Segments | undefined, c: CompanyInfo | null): string | null {
  if (!hasSegments(seg) || !c) return null;
  if (seg!.models?.length && c.model) {
    const ok = seg!.models.includes(c.model) || (c.model === "b2b2c" && seg!.models.some((m) => m === "b2b" || m === "b2c"));
    if (!ok) return `segmento: empresa ${modelLabel(c.model)}`;
  }
  if (seg!.industries?.length && c.industry && !seg!.industries.includes(c.industry)) return `segmento: setor ${industryLabel(c.industry)?.toLowerCase()}`;
  if (seg!.sizes?.length && c.size && !seg!.sizes.includes(c.size)) return `segmento: porte ${sizeLabel(c.size)?.toLowerCase()}`;
  return null;
}

export const companyKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
