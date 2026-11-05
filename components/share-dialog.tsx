"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Copy, Link2, Mail, RotateCw, ShieldCheck, UserPlus, X } from "lucide-react";
import { getShareInfo, inviteToSearch, removeMemberAction, resendInviteAction, setMemberRoleAction } from "@/app/actions";
import { Avatar } from "./avatar";
import type { Member } from "@/lib/db";
import { assignableRoles, canManageMember, ROLES, type MemberRole, type Role } from "@/lib/roles";
import { timeAgo } from "@/lib/format";
import { HelpButton, ModuleTip } from "./guide";

type Info = { members: Member[]; myRole: Role; canResend: boolean };
type Msg = { ok: boolean; text: string } | null;

export function ShareDialog({ searchId, searchName, onClose }: { searchId: string; searchName: string; onClose: () => void }) {
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("viewer");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();

  const load = () => getShareInfo(searchId).then(setInfo).catch((e) => setFailed(e instanceof Error ? e.message : "Não consegui carregar."));
  useEffect(() => {
    let alive = true;
    getShareInfo(searchId).then((i) => alive && setInfo(i)).catch((e) => alive && setFailed(e instanceof Error ? e.message : "Não consegui carregar."));
    return () => { alive = false; };
  }, [searchId]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  const options = assignableRoles(info?.myRole);
  const act = (fn: () => Promise<string | void>) =>
    start(async () => {
      setMsg(null);
      try {
        const text = await fn();
        await load();
        router.refresh();
        if (text) setMsg({ ok: true, text });
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "Algo deu errado." });
      }
    });

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    act(async () => {
      const r = await inviteToSearch(searchId, email, role);
      setEmail("");
      return r.emailed ? `Convite enviado por e-mail para ${r.member.email}.` : `Convite criado. Copie o link e envie para ${r.member.email}${r.emailError ? ` (o e-mail automático falhou: ${r.emailError})` : "."}`;
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center">
      <div className="anim-fade absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-label="Compartilhar busca" className="anim-pop scroll-thin pb-safe relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-line bg-surface p-5 text-left shadow-pop sm:rounded-[28px] sm:p-8">
        <div className="absolute top-4 right-4 flex items-center gap-0.5 sm:top-5 sm:right-5">
          <HelpButton id="share" className="size-10 sm:size-9" />
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-10 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink sm:size-9"><X className="size-5" /></button>
        </div>
        <p className="text-xs font-medium tracking-wider text-accent uppercase">Compartilhar</p>
        <h2 className="font-display mt-1 pr-20 text-3xl sm:text-4xl">{searchName}</h2>
        <ModuleTip id="share" className="mt-4" />
        <p className="mt-3 text-sm text-ink-2">Quem aceitar vê as vagas que o robô encontrar e <strong className="font-medium text-ink">recebe as vagas novas por e-mail</strong> (cada pessoa pode desligar). Favoritas e Kanban continuam individuais.</p>

        {failed ? (
          <p className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{failed}</p>
        ) : (
          <>
            <form onSubmit={invite} className="mt-6 space-y-2">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail da pessoa" autoComplete="off"
                    className="w-full rounded-xl border border-line bg-bg py-3 pr-3 pl-10 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15" />
                </div>
                <button disabled={pending || !email.trim() || !info} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50">
                  <UserPlus className="size-4" /> <span className="hidden sm:inline">{pending ? "…" : "Convidar"}</span><span className="sr-only sm:hidden">Convidar</span>
                </button>
              </div>
              <RolePicker value={role} options={options.length ? options : ["viewer"]} onChange={setRole} disabled={!info} label="Nível de acesso do convite" />
            </form>
            {msg && <p role="status" className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"}`}>{msg.text}</p>}

            <div className="mt-6">
              <p className="mb-2 text-xs font-medium tracking-wider text-ink-3 uppercase">Pessoas com acesso</p>
              {info === null ? (
                <div className="space-y-2">{[0, 1].map((n) => <div key={n} className="skeleton h-16 rounded-2xl" />)}</div>
              ) : info.members.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">Ninguém ainda. Convide alguém pelo e-mail acima.</p>
              ) : (
                <ul className="space-y-2">
                  {info.members.map((m) => (
                    <MemberRow key={m.id} m={m} myRole={info.myRole} canResend={info.canResend} busy={pending}
                      onRole={(r) => act(async () => { await setMemberRoleAction(m.id, r); return `${m.member_name ?? m.email} agora: ${ROLES.find((x) => x.key === r)!.label.toLowerCase()}.`; })}
                      onResend={() => act(async () => { const r = await resendInviteAction(m.id); return `Convite reenviado para ${r.to}.`; })}
                      onRemove={() => act(async () => { await removeMemberAction(m.id); })} />
                  ))}
                </ul>
              )}
            </div>

            <details className="group mt-5 rounded-2xl bg-surface-2/70 px-4 py-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
                <ShieldCheck className="size-4 text-accent" /> O que cada nível pode fazer <ChevronDown className="ml-auto size-4 text-ink-3 transition group-open:rotate-180" />
              </summary>
              <ul className="mt-3 space-y-2 text-[13px] text-ink-2">
                {ROLES.map((r) => <li key={r.key}><strong className="font-medium text-ink">{r.label}:</strong> {r.hint}</li>)}
                <li><strong className="font-medium text-ink">Só quem criou a busca</strong> pode excluí-la e mudar o acesso de quem gerencia.</li>
              </ul>
            </details>
          </>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs text-ink-3"><Copy className="mt-0.5 size-3.5 shrink-0" /> O convite só funciona para quem entrar com o mesmo e-mail que foi convidado.</p>
      </div>
    </div>,
    document.body,
  );
}

export function RolePicker({ value, options, onChange, disabled, label, compact }: { value: MemberRole; options: MemberRole[]; onChange: (r: MemberRole) => void; disabled?: boolean; label: string; compact?: boolean }) {
  if (compact) {
    return (
      <label className="relative inline-flex shrink-0 items-center">
        <span className="sr-only">{label}</span>
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as MemberRole)}
          className="min-h-9 cursor-pointer appearance-none rounded-full border border-line bg-surface py-1.5 pr-7 pl-3 text-xs font-medium outline-none transition hover:bg-surface-2 focus:border-accent disabled:opacity-60">
          {ROLES.filter((r) => options.includes(r.key) || r.key === value).map((r) => <option key={r.key} value={r.key} disabled={!options.includes(r.key)}>{r.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-ink-3" />
      </label>
    );
  }
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg p-1">
      {ROLES.filter((r) => options.includes(r.key)).map((r) => (
        <button key={r.key} type="button" role="radio" aria-checked={value === r.key} disabled={disabled} onClick={() => onChange(r.key)} title={r.hint}
          className={`min-h-10 rounded-lg px-1.5 py-1.5 text-xs leading-tight transition sm:px-2 sm:text-[13px] ${value === r.key ? "bg-surface font-medium shadow-card" : "text-ink-3 hover:text-ink"}`}>{r.label}</button>
      ))}
    </div>
  );
}

export function MemberRow({ m, myRole, canResend, busy, onRole, onResend, onRemove }: {
  m: Member; myRole: Role; canResend: boolean; busy: boolean;
  onRole: (r: MemberRole) => void; onResend: () => void; onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const can = canManageMember(myRole, m.role);
  const pendingInvite = m.status === "pending";
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/convite/${m.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const chip = "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2 disabled:opacity-50";

  return (
    <li className="rounded-2xl border border-line bg-bg p-3">
      <div className="flex items-center gap-3">
        <Avatar name={m.member_name ?? m.email} size={38} round />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{m.member_name ?? m.email}</p>
          <p className="truncate text-xs text-ink-3">
            {m.member_name ? m.email : pendingInvite ? (m.last_sent_at ? `convite enviado ${timeAgo(m.last_sent_at)}` : "aguardando aceite") : m.email}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${pendingInvite ? "bg-surface-2 text-ink-2" : "bg-ok-soft text-ok"}`}>{pendingInvite ? "Pendente" : "Ativo"}</span>
        {can && !confirm && (
          <button type="button" aria-label={`Remover ${m.email}`} title="Remover acesso" onClick={() => setConfirm(true)}
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-accent-soft hover:text-accent"><X className="size-4" /></button>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-[50px]">
        {can
          ? <RolePicker compact value={m.role} options={assignableRoles(myRole)} onChange={onRole} disabled={busy} label={`Nível de acesso de ${m.email}`} />
          : <span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-2">{ROLES.find((r) => r.key === m.role)?.label}</span>}
        {pendingInvite && can && canResend && (
          <button type="button" disabled={busy} onClick={onResend} className={chip} title="Mandar o e-mail do convite de novo"><RotateCw className="size-3.5" /> Reenviar</button>
        )}
        {pendingInvite && can && (
          <button type="button" onClick={copy} className={chip} title="Copiar link do convite">
            {copied ? <><Check className="size-3.5 text-ok" /> Copiado</> : <><Link2 className="size-3.5" /> Link</>}
          </button>
        )}
        {confirm && (
          <span className="anim-pop inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pr-1 pl-3 text-xs text-accent">
            {pendingInvite ? "Cancelar convite?" : "Remover acesso?"}
            <button type="button" disabled={busy} onClick={() => { setConfirm(false); onRemove(); }} className="rounded-full bg-accent px-2.5 py-1 font-medium text-accent-ink">Sim</button>
            <button type="button" onClick={() => setConfirm(false)} className="rounded-full px-2 py-1">Não</button>
          </span>
        )}
      </div>
    </li>
  );
}
