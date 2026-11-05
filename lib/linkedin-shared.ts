// Tipos e constantes do módulo Perfil do LinkedIn (client-safe).
import type { ResumeSuggestion } from "./resume-shared";

export const LI_SUBSCORES = [
  { key: "headline", label: "Título" },
  { key: "about", label: "Sobre" },
  { key: "experience", label: "Experiências" },
  { key: "skills", label: "Competências" },
  { key: "search", label: "Encontrabilidade" },
] as const;
export type LiSubscoreKey = (typeof LI_SUBSCORES)[number]["key"];

/** Limites de caracteres do LinkedIn (para os contadores). */
export const LI_LIMITS = { headline: 220, about: 2600 } as const;

export type LinkedinAnalysis = {
  score: number;
  label: string;
  summary: string;
  subscores: { key: LiSubscoreKey; score: number; comment: string }[];
  headlines: string[]; // 3 opções de título
  about: string; // "Sobre" reescrito
  keywords_have: string[];
  keywords_missing: string[];
  skills: string[]; // competências para colocar em destaque (top 5)
  suggestions: ResumeSuggestion[]; // por seção; status accepted = "feito"
  checklist: string[]; // o que conferir e o PDF não mostra (foto, capa, URL, recomendações…)
};

export type LinkedinProfile = {
  user_id: string;
  text: string;
  target_role: string;
  file_name: string;
  analysis: LinkedinAnalysis;
  created_at: number;
  updated_at: number;
  analyzed_at: number;
};
