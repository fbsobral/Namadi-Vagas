import type { Viewer } from "./auth";

/**
 * Administradores da plataforma, por qualquer um dos dois caminhos:
 *  - no Clerk: Users › (pessoa) › Metadata › Public = { "role": "admin" };
 *  - ou e-mail VERIFICADO listado em ADMIN_EMAILS (separados por vírgula), útil como acesso de emergência.
 */
export function isAdminViewer(v: Viewer | null) {
  if (!v) return false;
  if (v.role === "admin") return true;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.length > 0 && v.emails.some((e) => admins.includes(e));
}
