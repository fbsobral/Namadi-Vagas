import "server-only";

/** Envio via Resend (API HTTP). RESEND_API_URL existe só para apontar testes para um servidor local. */
export const mailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

export async function sendMail(m: { to: string; subject: string; html: string; text: string; headers?: Record<string, string> }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) throw new Error("Envio de e-mail não configurado (defina RESEND_API_KEY e MAIL_FROM).");

  const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string; name?: string } | null;
    throw new Error(`Resend ${res.status}: ${body?.message ?? body?.name ?? "falha ao enviar"}`.slice(0, 200));
  }
}

export const appUrl = () => (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
