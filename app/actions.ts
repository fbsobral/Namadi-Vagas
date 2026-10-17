"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getUserId, getViewer, getViewerEmail } from "@/lib/auth";
import * as q from "@/lib/db";
import { runSearch } from "@/lib/runner";
import { renderDigest, renderInvite } from "@/lib/email";
import { appUrl, mailConfigured, sendMail } from "@/lib/mailer";
import { signUnsub } from "@/lib/unsub";
import { findContacts } from "@/lib/contacts";
import { linkedinDescription } from "@/lib/providers";
import { PALETTE, SOURCES } from "@/lib/sources";
import { isStage } from "@/lib/stages";
import { cleanSpec, specToQuery, type QuerySpec } from "@/lib/query";

export type SearchInput = {
  name: string;
  spec: QuerySpec;
  location: string;
  sources: string[];
  recency: "day" | "week" | "month" | "any";
  freq_minutes: number;
  notify_mode: "off" | "run" | "daily";
};

async function uid() {
  const userId = await getUserId();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

function sanitize(i: SearchInput) {
  const spec = cleanSpec(i.spec);
  const query = specToQuery(spec).slice(0, 400);
  if (!query) throw new Error("Adicione pelo menos uma palavra-chave");
  const valid = new Set(SOURCES.map((s) => s.key));
  const sources = i.sources.filter((s) => valid.has(s));
  return {
    name: (i.name.trim() || spec.groups[0]?.terms[0] || query).slice(0, 80),
    query,
    query_spec: JSON.stringify(spec),
    location: i.location.trim().slice(0, 80),
    sources: JSON.stringify(sources.length ? sources : ["web"]),
    recency: (["day", "week", "month", "any"].includes(i.recency) ? i.recency : "week") as SearchInput["recency"],
    freq_minutes: Math.min(Math.max(Math.round(i.freq_minutes) || 360, 15), 60 * 24 * 30),
    notify_mode: (["off", "run", "daily"].includes(i.notify_mode) ? i.notify_mode : "off") as SearchInput["notify_mode"],
  };
}

const refresh = () => revalidatePath("/dashboard");

export async function createSearch(input: SearchInput) {
  const userId = await uid();
  const id = randomUUID();
  const count = (await q.listSearches(userId)).length;
  const data = sanitize(input);
  const email = data.notify_mode === "off" ? null : await getViewerEmail();
  if (data.notify_mode !== "off" && !email) throw new Error("Seu e-mail principal não está verificado, então não dá para ligar o resumo por e-mail.");
  await q.insertSearch({ id, user_id: userId, active: 1, color: PALETTE[count % PALETTE.length], notify_email: email, ...data });
  after(() => runSearch(id)); // já traz as primeiras vagas
  refresh();
  return id;
}

export async function editSearch(id: string, input: SearchInput) {
  const userId = await uid();
  const { notify_mode, ...data } = sanitize(input);
  const email = notify_mode === "off" ? null : await getViewerEmail();
  if (notify_mode !== "off" && !email) throw new Error("Seu e-mail principal não está verificado, então não dá para ligar o resumo por e-mail.");
  await q.updateSearch(userId, id, data);
  await q.setNotify(userId, id, notify_mode, email);
  refresh();
}

export async function removeSearch(id: string) {
  await q.deleteSearch(await uid(), id);
  refresh();
}

export async function toggleSearch(id: string, active: boolean) {
  await q.setSearchActive(await uid(), id, active);
  refresh();
}

export async function runNow(id: string) {
  const userId = await uid();
  if (!(await q.getSearch(userId, id))) throw new Error("Busca não encontrada");
  const r = await runSearch(id);
  refresh();
  return r;
}

export async function toggleFavorite(jobId: string, fav: boolean) {
  const userId = await uid();
  const job = await q.getJob(userId, jobId);
  if (!job) throw new Error("Vaga não encontrada");
  await q.setFavorite(userId, jobId, fav);
  // claim atômico: favoritar duas vezes (ou em duas abas) nunca dispara duas buscas
  if (fav && (await q.claimContacts(userId, jobId))) after(() => findContacts(jobId)); // robô do LinkedIn em segundo plano
  refresh();
}

export async function retryContacts(jobId: string) {
  const userId = await uid();
  if (!(await q.getJob(userId, jobId))) throw new Error("Vaga não encontrada");
  if (await q.claimContacts(userId, jobId, true)) after(() => findContacts(jobId));
  refresh();
}

export async function seeJob(jobId: string) {
  const userId = await uid();
  if (!(await q.getJob(userId, jobId))) return; // sem acesso: ignora
  await q.markSeen(userId, jobId);
  refresh();
}

export async function seeAll(searchId: string | null) {
  await q.markAllSeen(await uid(), searchId);
  refresh();
}

export async function moveJobStage(jobId: string, stage: string, index: number) {
  if (!isStage(stage)) throw new Error("Etapa inválida");
  await q.moveJob(await uid(), jobId, stage, index);
  refresh();
}

/** Para o formulário: e-mail que receberá o resumo e se o servidor já sabe enviar. */
export async function getMailInfo() {
  await uid();
  return { email: await getViewerEmail(), configured: mailConfigured() };
}

/** Envia um e-mail de teste com as vagas mais recentes da busca (ou exemplos, se ainda não houver). */
export async function sendTestEmail(searchId: string) {
  const userId = await uid();
  const search = await q.getSearch(userId, searchId);
  if (!search) throw new Error("Busca não encontrada");
  if (!mailConfigured()) throw new Error("O envio de e-mail ainda não está configurado no servidor (RESEND_API_KEY e MAIL_FROM).");
  const to = await getViewerEmail();
  if (!to) throw new Error("Seu e-mail principal não está verificado.");

  const real = await q.listJobs(userId, { searchId, filter: "all", limit: 3 });
  const jobs = real.length
    ? real.map((j) => ({ id: j.id, title: j.title, company: j.company, location: j.location, source: j.source, url: j.url, found_at: j.found_at }))
    : [{ id: "x", title: "Vaga de exemplo", company: "Empresa Exemplo", location: "São Paulo, SP", source: "linkedin", url: appUrl(), found_at: Date.now() }];
  const base = appUrl();
  const unsubscribeUrl = `${base}/api/unsubscribe?s=${search.id}&t=${signUnsub(search.id)}`;
  const mail = renderDigest({ searchName: search.name, color: search.color, jobs, appUrl: base, searchUrl: `${base}/dashboard?s=${search.id}`, unsubscribeUrl, test: true });
  await sendMail({ to, ...mail });
  return { to };
}

/** "Manter na lista": tira a vaga de "Filtradas" e impede que ela seja barrada de novo. */
export async function keepFiltered(jobId: string) {
  await q.keepJob(await uid(), jobId);
  refresh();
}

/** Lê (uma vez) a descrição de uma vaga do LinkedIn quando o usuário a abre; fica guardada. */
export async function ensureDescription(jobId: string) {
  const userId = await uid();
  const job = await q.getJob(userId, jobId);
  if (!job) throw new Error("Vaga não encontrada");
  if (job.description !== null) return job.description;
  if (job.source !== "linkedin") return "";
  const text = await linkedinDescription(job.url).catch((e) => {
    throw new Error(/429/.test(String(e)) ? "O LinkedIn limitou as consultas. Tente abrir de novo em alguns minutos." : "Não consegui ler a descrição agora.");
  });
  await q.setDescription(jobId, text ?? "");
  refresh();
  return text ?? "";
}

/* ------------------------------ compartilhamento ------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Membros e convites da busca (só a dona vê). */
export async function getShareInfo(searchId: string) {
  return q.listMembers(await uid(), searchId);
}

/** Convida um e-mail. Sempre devolve o link; manda o e-mail do convite também, se o envio estiver configurado. */
export async function inviteToSearch(searchId: string, email: string) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Não autenticado");
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new Error("Esse e-mail não parece válido.");
  if (viewer.emails.includes(e)) throw new Error("Esse é o seu próprio e-mail.");
  const search = await q.getSearch(viewer.userId, searchId);
  if (!search) throw new Error("Só quem criou a busca pode convidar.");

  const { member, created } = await q.inviteMember(viewer.userId, searchId, e, viewer.name);
  let emailed = false;
  let emailError: string | undefined;
  if (created && mailConfigured()) {
    try {
      const mail = renderInvite({ inviterName: viewer.name, searchName: search.name, acceptUrl: `${appUrl()}/convite/${member.token}`, appUrl: appUrl() });
      await sendMail({ to: e, ...mail });
      emailed = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
    }
  }
  refresh();
  return { member, emailed, emailError };
}

export async function removeMemberAction(memberId: string) {
  await q.removeMember(await uid(), memberId);
  refresh();
}

export async function leaveSharedSearch(searchId: string) {
  await q.leaveSearch(await uid(), searchId);
  refresh();
}

/** Aceita pelo painel (id do convite) ou pelo link (token). Só funciona com o e-mail do convite. */
export async function acceptInviteAction(by: { id?: string; token?: string }) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Não autenticado");
  const searchId = await q.acceptInvite(viewer.userId, viewer.emails, by, viewer.name);
  if (!searchId) throw new Error("Esse convite é para outro e-mail ou não está mais disponível.");
  refresh();
  return searchId;
}

export async function declineInviteAction(memberId: string) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Não autenticado");
  await q.declineInvite(viewer.emails, memberId);
  refresh();
}
