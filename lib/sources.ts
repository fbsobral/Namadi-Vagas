// Catálogo de fontes (client-safe). "web" = Google aberto, sem filtro de site.
export type Source = { key: string; label: string; sites: string[]; hint?: string };

export const SOURCES: Source[] = [
  { key: "web", label: "Google aberto", sites: [], hint: "qualquer site" },
  { key: "linkedin", label: "LinkedIn", sites: ["linkedin.com/jobs/view"] },
  { key: "gupy", label: "Gupy", sites: ["gupy.io"] },
  { key: "greenhouse", label: "Greenhouse", sites: ["boards.greenhouse.io", "job-boards.greenhouse.io"] },
  { key: "lever", label: "Lever", sites: ["jobs.lever.co"] },
  { key: "ashby", label: "Ashby", sites: ["jobs.ashbyhq.com"] },
  { key: "workable", label: "Workable", sites: ["apply.workable.com"] },
  { key: "indeed", label: "Indeed", sites: ["indeed.com", "br.indeed.com"] },
  { key: "glassdoor", label: "Glassdoor", sites: ["glassdoor.com.br", "glassdoor.com"] },
  { key: "vagas", label: "Vagas.com", sites: ["vagas.com.br"] },
  { key: "catho", label: "Catho", sites: ["catho.com.br"] },
  { key: "infojobs", label: "InfoJobs", sites: ["infojobs.com.br"] },
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
  const intent = useWeb ? " (vaga OR job OR hiring OR contratando OR careers)" : "";
  return `${query}${location ? ` ${location}` : ""}${intent}${siteExpr}`.replace(/\s+/g, " ").trim();
}
