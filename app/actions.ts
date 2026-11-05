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
import { isGuideId } from "@/lib/onboarding";
import { assignableRoles, canEdit, canManage, canManageMember, isMemberRole, type MemberRole } from "@/lib/roles";

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

/** Garante que quem chama pode editar a busca (dona ou convidado com "Pode editar"/"Pode gerenciar"). */
async function editable(userId: string, searchId: string) {
  const a = await q.roleFor(userId, searchId);
  if (!a) throw new Error("Busca não encontrada");
  if (!canEdit(a.role)) throw new Error("Seu acesso a esta busca é só de leitura.");
  return a;
}

/** Garante que quem chama pode gerenciar as pessoas da busca (dona ou "Pode gerenciar"). */
async function manageable(userId: string, searchId: string) {
  const a = await q.roleFor(userId, searchId);
  if (!a) throw new Error("Busca não encontrada");
  if (!canManage(a.role)) throw new Error("Só quem gerencia a busca pode convidar e mudar acessos.");
  return a;
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
  if (count >= 30) throw new Error("Limite de 30 buscas por conta atingido. Remova alguma antes de criar outra.");
  await q.rateLimit("create", userId, 20, 3600_000, "Muitas buscas criadas em pouco tempo. Tente de novo em uma hora.");
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
  const { role } = await editable(userId, id);
  const { notify_mode, ...data } = sanitize(input);
  await q.updateSearch(id, data);
  // o resumo por e-mail da busca é da dona; cada convidado ajusta o seu na barra da busca
  if (role === "owner") {
    const email = notify_mode === "off" ? null : await getViewerEmail();
    if (notify_mode !== "off" && !email) throw new Error("Seu e-mail principal não está verificado, então não dá para ligar o resumo por e-mail.");
    await q.setNotify(userId, id, notify_mode, email);
  }
  refresh();
}

export async function removeSearch(id: string) {
  await q.deleteSearch(await uid(), id);
  refresh();
}

export async function toggleSearch(id: string, active: boolean) {
  await editable(await uid(), id);
  await q.setSearchActive(id, active);
  refresh();
}

export async function runNow(id: string) {
  const userId = await uid();
  await editable(userId, id);
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
  await q.rateLimit("contacts", userId, 40, 86400_000, "Limite diário de buscas de contatos atingido. Tente amanhã.");
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
  await q.rateLimit("testmail", userId, 10, 86400_000, "Limite diário de e-mails de teste atingido. Tente amanhã.");
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
  const userId = await uid();
  const job = await q.getJob(userId, jobId);
  if (!job) throw new Error("Vaga não encontrada");
  await editable(userId, job.search_id);
  await q.keepJob(jobId);
  refresh();
}

/** Lê (uma vez) a descrição de uma vaga do LinkedIn quando o usuário a abre; fica guardada. */
export async function ensureDescription(jobId: string) {
  const userId = await uid();
  const job = await q.getJob(userId, jobId);
  if (!job) throw new Error("Vaga não encontrada");
  if (job.description !== null) return job.description;
  if (job.source !== "linkedin") return "";
  await q.rateLimit("desc", userId, 120, 3600_000, "Muitas vagas abertas em pouco tempo. Tente de novo em alguns minutos.");
  const text = await linkedinDescription(job.url).catch((e) => {
    throw new Error(/429/.test(String(e)) ? "O LinkedIn limitou as consultas. Tente abrir de novo em alguns minutos." : "Não consegui ler a descrição agora.");
  });
  await q.setDescription(jobId, text ?? "");
  refresh();
  return text ?? "";
}

/* ------------------------------ compartilhamento ------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Membros e convites da busca, e o que quem pergunta pode fazer com eles. */
export async function getShareInfo(searchId: string) {
  const { role } = await manageable(await uid(), searchId);
  return { members: await q.listMembers(searchId), myRole: role, canResend: mailConfigured() };
}

/** Nome de quem criou a busca, como o convidado vai ver ("de Fulano"). Um gestor herda o que recebeu no próprio convite. */
const ownerNameFor = (a: Awaited<ReturnType<typeof manageable>>, viewerName: string) =>
  a.role === "owner" ? viewerName : a.member?.inviter_name ?? null;

async function sendInvite(member: q.Member, searchName: string, inviterName: string) {
  const mail = renderInvite({ inviterName, searchName, role: member.role, acceptUrl: `${appUrl()}/convite/${member.token}`, appUrl: appUrl() });
  await sendMail({ to: member.email, ...mail });
  await q.markInviteSent(member.id);
}

/** Convida um e-mail. Sempre devolve o link; manda o e-mail do convite também, se o envio estiver configurado. */
export async function inviteToSearch(searchId: string, email: string, role: MemberRole = "viewer") {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Não autenticado");
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new Error("Esse e-mail não parece válido.");
  if (viewer.emails.includes(e)) throw new Error("Esse é o seu próprio e-mail.");
  const access = await manageable(viewer.userId, searchId);
  if (!isMemberRole(role) || !assignableRoles(access.role).includes(role)) throw new Error("Você não pode dar esse nível de acesso.");
  await q.rateLimit("invite", viewer.userId, 20, 86400_000, "Limite diário de convites atingido. Tente amanhã.");

  const { member, created } = await q.inviteMember(viewer.userId, searchId, e, ownerNameFor(access, viewer.name), role);
  let emailed = false;
  let emailError: string | undefined;
  if (created && mailConfigured()) {
    try {
      await sendInvite(member, access.search.name, viewer.name);
      emailed = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
    }
  }
  refresh();
  return { member, emailed, emailError };
}

/** Manda de novo o e-mail de um convite que ainda não foi aceito. */
export async function resendInviteAction(memberId: string) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Não autenticado");
  const member = await q.getMember(memberId);
  if (!member) throw new Error("Convite não encontrado");
  const access = await manageable(viewer.userId, member.search_id);
  if (!canManageMember(access.role, member.role)) throw new Error("Você não pode reenviar este convite.");
  if (member.status !== "pending") throw new Error("Essa pessoa já aceitou o convite.");
  if (!mailConfigured()) throw new Error("O envio de e-mail não está configurado no servidor. Copie o link e mande você mesmo.");
  if (member.last_sent_at && Date.now() - member.last_sent_at < 10 * 60_000) throw new Error("Convite enviado há pouco. Espere uns minutos antes de reenviar.");
  await q.rateLimit("invite", viewer.userId, 20, 86400_000, "Limite diário de convites atingido. Tente amanhã.");
  await sendInvite(member, access.search.name, viewer.name);
  return { to: member.email };
}

/** Muda o nível de acesso de alguém (convite pendente ou já aceito). */
export async function setMemberRoleAction(memberId: string, role: MemberRole) {
  const userId = await uid();
  if (!isMemberRole(role)) throw new Error("Nível inválido");
  const member = await q.getMember(memberId);
  if (!member) throw new Error("Pessoa não encontrada");
  const access = await manageable(userId, member.search_id);
  if (member.user_id === userId) throw new Error("Você não pode mudar o seu próprio acesso.");
  if (!canManageMember(access.role, member.role) || !assignableRoles(access.role).includes(role)) throw new Error("Você não pode dar esse nível de acesso.");
  await q.setMemberRole(memberId, role);
  refresh();
}

export async function removeMemberAction(memberId: string) {
  const userId = await uid();
  const member = await q.getMember(memberId);
  if (!member) return;
  const access = await manageable(userId, member.search_id);
  if (member.user_id === userId) throw new Error("Para sair, use “Sair da busca”.");
  if (!canManageMember(access.role, member.role)) throw new Error("Você não pode remover esta pessoa.");
  await q.removeMember(memberId);
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

/** O convidado escolhe como quer receber as vagas novas desta busca. */
export async function setMyNotifyAction(searchId: string, mode: "off" | "run" | "daily") {
  if (!["off", "run", "daily"].includes(mode)) throw new Error("Modo inválido");
  await q.setMyNotify(await uid(), searchId, mode);
  refresh();
}

export async function declineInviteAction(memberId: string) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Não autenticado");
  await q.declineInvite(viewer.emails, memberId);
  refresh();
}

/* ---------- onboarding ---------- */

export async function markGuideSeen(id: string) {
  const userId = await uid();
  if (!isGuideId(id)) return;
  await q.addSeenGuide(userId, id);
}

export async function resetGuides() {
  const userId = await uid();
  await q.resetSeenGuides(userId);
  refresh();
}

/* ---------- currículo ---------- */


async function myResume(userId: string) {
  const r = await q.getResume(userId);
  if (!r) throw new Error("Envie seu currículo primeiro, na área Currículo.");
  return r;
}

/** Erros da IA viram mensagens legíveis no cliente (server actions escondem a mensagem de erros genéricos em produção). */
async function friendly<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try { return { ok: true, data: await fn() }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Algo deu errado." }; }
}

/** Aceita uma sugestão: troca o trecho original pelo texto sugerido (ou acrescenta, quando não há trecho). */
export async function acceptSuggestionAction(id: string, edited?: string) {
  const userId = await uid();
  const r = await myResume(userId);
  const s = r.analysis.suggestions.find((x) => x.id === id);
  if (!s || s.status !== "open") return;
  const next = (edited ?? s.suggestion).trim().slice(0, 2000);
  let text = r.text;
  if (s.original && text.includes(s.original)) text = text.replace(s.original, next);
  else text = `${text.trimEnd()}\n\n${next}`;
  const suggestions = r.analysis.suggestions.map((x) => (x.id === id ? { ...x, suggestion: next, status: "accepted" as const } : x));
  await q.updateResumeText(userId, text.slice(0, 60_000), { ...r.analysis, suggestions });
  refresh();
}

export async function dismissSuggestionAction(id: string) {
  const userId = await uid();
  const r = await myResume(userId);
  const suggestions = r.analysis.suggestions.map((x) => (x.id === id && x.status === "open" ? { ...x, status: "dismissed" as const } : x));
  await q.updateResumeText(userId, r.text, { ...r.analysis, suggestions });
  refresh();
}

/** Edição manual do texto do currículo. */
export async function saveResumeTextAction(text: string) {
  const userId = await uid();
  const r = await myResume(userId);
  const t = String(text).trim();
  if (t.length < 80) throw new Error("O currículo ficou curto demais.");
  await q.updateResumeText(userId, t.slice(0, 60_000), r.analysis);
  refresh();
}

/** Nova nota e novas sugestões a partir do texto atual (depois de aceitar sugestões ou editar). */
export async function reanalyzeResumeAction() {
  const userId = await uid();
  return friendly(async () => {
    const r = await myResume(userId);
    const { getAiConfig } = await import("@/lib/ai-config");
    const RESUME_DAILY = (await getAiConfig()).features.resume.daily;
    await q.rateLimit("resume", userId, RESUME_DAILY, 86400_000, `Limite de ${RESUME_DAILY} análises de currículo por dia atingido. Tente amanhã.`);
    const { analyzeText } = await import("@/lib/resume");
    const { analysis } = await analyzeText(r.text);
    await q.saveResume(userId, r.file_name, r.text, analysis); // mantém o texto como está; só a análise é nova
    refresh();
    return { score: analysis.score, before: r.analysis.score };
  });
}

export async function deleteResumeAction() {
  await q.deleteResume(await uid());
  refresh();
}

/** Compara o currículo com a vaga (guarda o resultado; `force` refaz). */
export async function jobFitAction(jobId: string, force = false) {
  const userId = await uid();
  return friendly(async () => {
    const { computeFit } = await import("@/lib/resume-service");
    const row = await computeFit(userId, jobId, { force });
    refresh();
    return row;
  });
}

/** Liga/desliga o cálculo automático da compatibilidade das vagas novas. */
export async function setAutoFitAction(on: boolean) {
  await q.setAutoFit(await uid(), on);
  refresh();
}

async function jobForAi(userId: string, jobId: string) {
  const job = await q.getJob(userId, jobId);
  if (!job) throw new Error("Vaga não encontrada");
  let description = job.description ?? "";
  if (!description && job.source === "linkedin") description = await ensureDescription(jobId).catch(() => "");
  if (!description) description = job.snippet ?? "";
  if (description.trim().length < 40) throw new Error("Essa vaga não tem descrição suficiente para comparar. Abra o anúncio original.");
  return { title: job.title, company: job.company, location: job.location, description };
}

export async function coverLetterAction(jobId: string) {
  const userId = await uid();
  return friendly(async () => {
    const r = await myResume(userId);
    const { getAiConfig } = await import("@/lib/ai-config");
    await q.rateLimit("letter", userId, (await getAiConfig()).features.letter.daily, 86400_000, "Limite diário de cartas atingido. Tente amanhã.");
    const { coverLetter } = await import("@/lib/resume");
    const letter = await coverLetter(r.text, await jobForAi(userId, jobId));
    await q.saveLetter(userId, jobId, letter, r.updated_at);
    return letter;
  });
}

/* ---------- admin: IA ---------- */

async function requireAdmin() {
  const { isAdminViewer } = await import("@/lib/auth");
  const v = await getViewer();
  if (!isAdminViewer(v)) throw new Error("Acesso restrito a administradores.");
  return v!;
}

/** Salva a configuração de IA (só administradores). Valida tudo no servidor. */
export async function saveAiConfigAction(input: unknown) {
  await requireAdmin();
  const { AI_FEATURES, AI_MODELS } = await import("@/lib/ai-shared");
  const { saveAiConfig } = await import("@/lib/ai-config");
  const i = (input ?? {}) as { enabled?: unknown; features?: Record<string, { enabled?: unknown; model?: unknown; daily?: unknown }> };
  const features = Object.fromEntries(AI_FEATURES.map((f) => {
    const x = i.features?.[f.key] ?? {};
    const model = AI_MODELS.some((m) => m.id === x.model) ? (x.model as string) : f.model();
    const daily = Math.min(Math.max(Math.round(Number(x.daily)), 0), 100_000);
    return [f.key, { enabled: x.enabled !== false, model, daily: Number.isFinite(daily) ? daily : f.daily() }];
  }));
  await saveAiConfig({ enabled: i.enabled !== false, features } as never);
  revalidatePath("/", "layout");
}
