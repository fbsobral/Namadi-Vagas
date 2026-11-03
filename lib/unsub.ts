import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => {
  const s = process.env.EMAIL_SECRET || process.env.CLERK_SECRET_KEY;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("Defina EMAIL_SECRET: sem ele os links de cancelamento não podem ser assinados.");
  return "dev-only-secret";
};

/** Token do link "parar de receber": quem tem o link cancela, sem precisar entrar. */
export const signUnsub = (searchId: string) => createHmac("sha256", secret()).update(`unsub:${searchId}`).digest("hex").slice(0, 32);

export function verifyUnsub(searchId: string, token: string) {
  const a = Buffer.from(signUnsub(searchId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
