import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";





export async function getUserId() {
  return (await auth()).userId;
}

/** E-mail principal do usuário, só se estiver verificado (usado para enviar os resumos). */
export async function getViewerEmail(): Promise<string | null> {
  const u = await currentUser();
  const primary = u?.emailAddresses.find((e) => e.id === u.primaryEmailAddressId);
  return primary && primary.verification?.status === "verified" ? primary.emailAddress.toLowerCase() : null;
}

export type Viewer = { userId: string; name: string; firstName: string | null; email: string | null; emails: string[] };

/** Quem está logado: nome e e-mails VERIFICADOS (um convite só vale para um desses). */
export async function getViewer(): Promise<Viewer | null> {
  const u = await currentUser();
  if (!u) return null;
  const verified = u.emailAddresses.filter((e) => e.verification?.status === "verified");
  const emails = verified.map((e) => e.emailAddress.toLowerCase());
  const primary = verified.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress.toLowerCase() ?? emails[0] ?? null;
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || (primary ? primary.split("@")[0] : "Alguém");
  return { userId: u.id, name, firstName: u.firstName, email: primary, emails };
}

/** Administradores da plataforma: e-mails VERIFICADOS listados em ADMIN_EMAILS (separados por vírgula). */
export function isAdminViewer(v: Viewer | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!v && admins.length > 0 && v.emails.some((e) => admins.includes(e));
}
