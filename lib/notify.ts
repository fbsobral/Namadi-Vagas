import "server-only";
import { claimUnnotified, dueDigests, getKv, setKv, touchNotifyLast, unclaimJobs } from "./db";
import { renderDigest } from "./email";
import { appUrl, mailConfigured, sendMail } from "./mailer";
import { signUnsub } from "./unsub";
import type { Search } from "./types";

export type SendResult = { sent: number; error?: string };

/** Monta e envia o resumo das vagas ainda não avisadas. Falhar aqui nunca derruba a rodada: as vagas voltam para a fila. */
export async function sendDigest(s: Search): Promise<SendResult> {
  if (!s.notify_email || s.notify_mode === "off") return { sent: 0 };
  if (!mailConfigured()) return { sent: 0, error: "envio de e-mail não configurado" };

  const jobs = await claimUnnotified(s.id, s.notify_since ?? 0);
  if (!jobs.length) return { sent: 0 };

  try {
    const base = appUrl();
    const unsubscribeUrl = `${base}/api/unsubscribe?s=${s.id}&t=${signUnsub(s.id)}`;
    const mail = renderDigest({ searchName: s.name, color: s.color, jobs, appUrl: base, searchUrl: `${base}/dashboard?s=${s.id}`, unsubscribeUrl });
    await sendMail({
      to: s.notify_email,
      ...mail,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    return { sent: jobs.length };
  } catch (e) {
    await unclaimJobs(jobs.map((j) => j.id)); // volta para a fila; o próximo resumo leva junto
    return { sent: 0, error: (e instanceof Error ? e.message : String(e)).slice(0, 160) };
  }
}

/** Último "8h" (horário de São Paulo, UTC-3 o ano todo): 11:00 UTC de hoje, ou de ontem se ainda não chegou. */
export function lastDigestBoundary(now = Date.now()) {
  const d = new Date(now);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 11, 0, 0);
  return now >= t ? t : t - 86_400_000;
}

/** Resumos diários: chamado a cada minuto pelo agendador; envia uma vez por dia, depois das 8h. */
export async function runDigests(now = Date.now()) {
  const boundary = lastDigestBoundary(now);
  const out: { id: string; sent: number; error?: string }[] = [];
  for (const s of await dueDigests(boundary)) {
    const errKey = `digest_err:${s.id}`;
    const last = await getKv(errKey);
    if (last && now - last.updated_at < 10 * 60_000) continue; // depois de uma falha, espera 10 min
    const r = await sendDigest(s);
    if (r.error) { await setKv(errKey, r.error); out.push({ id: s.id, ...r }); continue; }
    await touchNotifyLast(s.id);
    out.push({ id: s.id, ...r });
  }
  return out;
}
