// Etapas do funil de candidatura (client-safe).
export const STAGES = [
  { key: "todo", label: "A candidatar", hint: "Vagas que você quer", color: "#2F6BFF" },
  { key: "applying", label: "Candidatando", hint: "Currículo e portfólio em preparo", color: "#E0A100" },
  { key: "applied", label: "Candidatura feita", hint: "Enviada, aguardando retorno", color: "#14A37F" },
  { key: "interview", label: "Em processo", hint: "Entrevistas e testes", color: "#A855F7" },
  { key: "closed", label: "Encerradas", hint: "Recusadas ou desistidas", color: "#8E8779" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];
export const isStage = (s: unknown): s is StageKey => STAGES.some((x) => x.key === s);
