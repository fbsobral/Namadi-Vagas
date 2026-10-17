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
