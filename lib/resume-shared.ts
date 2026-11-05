// Tipos e constantes do módulo Currículo (client-safe).

export const SUBSCORES = [
  { key: "coverage", label: "Abrangência" },
  { key: "structure", label: "Estrutura" },
  { key: "clarity", label: "Clareza" },
  { key: "impact", label: "Impacto" },
  { key: "ats", label: "Leitura por ATS" },
] as const;
export type SubscoreKey = (typeof SUBSCORES)[number]["key"];

export type ResumeSuggestion = {
  id: string;
  section: string;
  issue: string;
  original: string; // trecho exato do texto atual ("" = acrescentar algo novo)
  suggestion: string;
  why: string;
  priority: "alta" | "média" | "baixa";
  status: "open" | "accepted" | "dismissed";
  /** conversa do "Refinar com a IA": o que a pessoa acrescentou e o que a IA respondeu */
  thread?: { role: "user" | "ai"; text: string; at: number }[];
};

export type ResumeAnalysis = {
  score: number;
  label: string;
  summary: string;
  subscores: { key: SubscoreKey; score: number; comment: string }[];
  strengths: string[];
  keywords: string[];
  role: string;
  profile?: string; // perfil compacto (~60 palavras) usado na checagem rápida de compatibilidade
  suggestions: ResumeSuggestion[];
};

export type JobFit = {
  score: number;
  verdict: string;
  matched: string[];
  missing: string[];
  tips: string[];
  summary: string; // resumo profissional reescrito para esta vaga
  bullets: string[]; // destaques reescritos para esta vaga
  quick?: boolean; // checagem rápida (só nota e palavras-chave); a completa é pedida na vaga
};

export type Resume = {
  user_id: string;
  file_name: string;
  text: string;
  analysis: ResumeAnalysis;
  created_at: number;
  updated_at: number; // muda a cada sugestão aceita ou nova análise
  analyzed_at: number;
  auto_fit: number; // 1 = calcula sozinho a compatibilidade das vagas novas
};

export type JobFitRow = { job_id: string; fit: JobFit | null; letter: string | null; resume_at: number; updated_at: number };

export const fitLabel = (n: number) => (n >= 85 ? "Top match" : n >= 70 ? "Boa compatibilidade" : n >= 50 ? "Compatibilidade média" : "Pouca compatibilidade");
