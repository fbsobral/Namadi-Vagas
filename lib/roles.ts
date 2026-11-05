// Níveis de acesso de uma busca compartilhada (client-safe).
// "owner" é quem criou; os demais valem para convidados.

export type MemberRole = "viewer" | "editor" | "admin";
export type Role = MemberRole | "owner";

export const ROLES: { key: MemberRole; label: string; short: string; hint: string }[] = [
  { key: "viewer", label: "Pode ver", short: "Leitor", hint: "Vê as vagas e recebe os e-mails. Favoritas e Kanban são só dela." },
  { key: "editor", label: "Pode editar", short: "Editor", hint: "Também edita a busca, roda agora, pausa e mantém vagas filtradas." },
  { key: "admin", label: "Pode gerenciar", short: "Gestor", hint: "Também convida pessoas, reenvia convites e muda o acesso de leitores e editores." },
];

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };

export const isMemberRole = (r: unknown): r is MemberRole => r === "viewer" || r === "editor" || r === "admin";
export const roleLabel = (r: Role) => (r === "owner" ? "Criou a busca" : ROLES.find((x) => x.key === r)!.label);
export const canEdit = (r: Role | null | undefined) => !!r && RANK[r] >= RANK.editor;
export const canManage = (r: Role | null | undefined) => !!r && RANK[r] >= RANK.admin;

/** Quem pode mexer em quem: quem criou mexe em todos; gestores só em leitores e editores. */
export const canManageMember = (me: Role | null | undefined, target: MemberRole) =>
  me === "owner" || (me === "admin" && target !== "admin");

/** Níveis que `me` pode atribuir. */
export const assignableRoles = (me: Role | null | undefined): MemberRole[] =>
  me === "owner" ? ["viewer", "editor", "admin"] : me === "admin" ? ["viewer", "editor"] : [];
