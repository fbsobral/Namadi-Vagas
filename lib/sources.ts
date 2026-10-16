// Catálogo de fontes (client-safe). "web" = Google aberto, sem filtro de site.
export type Source = { key: string; label: string; sites: string[]; hint?: string };

// LinkedIn e Gupy são lidos direto (sem Google). "Google aberto" alcança qualquer outro site com página de vaga.
export const SOURCES: Source[] = [
  { key: "linkedin", label: "LinkedIn", sites: ["linkedin.com/jobs/view"], hint: "leitura direta, aceita E/OU" },
  { key: "gupy", label: "Gupy", sites: ["gupy.io"], hint: "leitura direta pela API" },
  { key: "web", label: "Google aberto", sites: [], hint: "qualquer site; mais lento e pode pedir CAPTCHA" },
];

export const FREQUENCIES = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hora" },
  { minutes: 180, label: "3 horas" },
  { minutes: 360, label: "6 horas" },
  { minutes: 720, label: "12 horas" },
  { minutes: 1440, label: "Diária" },
  { minutes: 10080, label: "Semanal" },
];

export const RECENCY = [
  { key: "day", label: "24 horas" },
  { key: "week", label: "7 dias" },
  { key: "month", label: "30 dias" },
  { key: "any", label: "Qualquer" },
] as const;

export const PALETTE = ["#E8501F", "#2F6BFF", "#14A37F", "#A855F7", "#E0A100", "#E11D74", "#0EA5C6", "#6B7A1E"];

export function freqLabel(min: number) {
  const f = FREQUENCIES.find((x) => x.minutes === min);
  if (f) return f.label === "Diária" ? "a cada dia" : f.label === "Semanal" ? "a cada semana" : `a cada ${f.label}`;
  if (min < 60) return `a cada ${min} min`;
  if (min % 1440 === 0) return `a cada ${min / 1440} dias`;
  if (min % 60 === 0) return `a cada ${min / 60} h`;
  return `a cada ${min} min`;
}

export function sourceLabel(key: string) {
  if (key === "demo") return "Demo";
  return SOURCES.find((s) => s.key === key)?.label ?? key;
}

/** Monta a consulta que será enviada ao Google. */
export function buildGoogleQuery(query: string, location: string, sourceKeys: string[]) {
  const keys = sourceKeys.filter((k) => k !== "web");
  const useWeb = sourceKeys.includes("web") || keys.length === 0;
  const sites = useWeb ? [] : keys.flatMap((k) => SOURCES.find((s) => s.key === k)?.sites ?? []);
  const siteExpr = sites.length ? ` (${sites.map((s) => `site:${s}`).join(" OR ")})` : "";
  const intent = useWeb ? " (inurl:vaga OR inurl:vagas OR inurl:job OR inurl:jobs OR inurl:careers OR inurl:carreiras) -curso -faculdade -salário" : "";
  return `${query}${location ? ` ${location}` : ""}${intent}${siteExpr}`.replace(/\s+/g, " ").trim();
}
