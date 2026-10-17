"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Mail, UserPlus, X } from "lucide-react";
import { getShareInfo, inviteToSearch, removeMemberAction } from "@/app/actions";
import { Avatar } from "./avatar";
import type { Member } from "@/lib/db";

export function ShareDialog({ searchId, searchName, onClose }: { searchId: string; searchName: string; onClose: () => void }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = () => getShareInfo(searchId).then(setMembers).catch(() => setMembers([]));
  useEffect(() => {
    let alive = true;
    getShareInfo(searchId).then((m) => alive && setMembers(m)).catch(() => alive && setMembers([]));
    return () => { alive = false; };
  }, [searchId]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  const link = (m: Member) => `${window.location.origin}/convite/${m.token}`;
  const copy = async (m: Member) => {
    await navigator.clipboard.writeText(link(m));
    setCopied(m.id);
    setTimeout(() => setCopied(null), 1800);
  };

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      try {
        const r = await inviteToSearch(searchId, email);
        setEmail("");
        setMsg({
          ok: true,
          text: r.emailed ? `Convite enviado por e-mail para ${r.member.email}.` : `Convite criado. Copie o link e envie para ${r.member.email}${r.emailError ? ` (o e-mail automático falhou: ${r.emailError})` : "."}`,
        });
        await load();
        router.refresh();
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "Não consegui convidar." });
      }
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center">
      <div className="anim-fade absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-label="Compartilhar busca" className="anim-pop scroll-thin pb-safe relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-line bg-surface p-6 text-left shadow-pop sm:rounded-[28px] sm:p-8">
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute top-5 right-5 grid size-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink"><X className="size-5" /></button>
        <p className="text-xs font-medium tracking-wider text-accent uppercase">Compartilhar</p>
        <h2 className="font-display mt-1 pr-10 text-3xl sm:text-4xl">{searchName}</h2>
        <p className="mt-2 text-sm text-ink-2">Quem aceitar o convite vê as vagas que o robô encontrar nesta busca. <strong className="font-medium text-ink">Favoritos e Kanban continuam individuais.</strong> Só você edita, pausa e exclui.</p>

        <form onSubmit={invite} className="mt-6 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail da pessoa" autoComplete="off"
              className="w-full rounded-xl border border-line bg-bg py-3 pr-3 pl-10 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15" />
          </div>
          <button disabled={pending || !email.trim()} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50">
            <UserPlus className="size-4" /> {pending ? "…" : "Convidar"}
          </button>
        </form>
        {msg && <p role="status" className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"}`}>{msg.text}</p>}

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium tracking-wider text-ink-3 uppercase">Pessoas com acesso</p>
          {members === null ? (
            <div className="space-y-2">{[0, 1].map((n) => <div key={n} className="skeleton h-14 rounded-2xl" />)}</div>
          ) : members.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">Ninguém ainda. Convide alguém pelo e-mail acima.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-bg p-3">
                  <Avatar name={m.member_name ?? m.email} size={38} round />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.member_name ?? m.email}</p>
                    <p className="truncate text-xs text-ink-3">{m.member_name ? m.email : "aguardando aceite"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${m.status === "accepted" ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-2"}`}>{m.status === "accepted" ? "Ativo" : "Pendente"}</span>
                  {m.status === "pending" && (
                    <button type="button" onClick={() => copy(m)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2" title="Copiar link do convite">
                      {copied === m.id ? <><Check className="size-3.5 text-ok" /> Copiado</> : <><Link2 className="size-3.5" /> Link</>}
                    </button>
                  )}
                  <button type="button" aria-label={`Remover ${m.email}`} title="Remover acesso"
                    onClick={() => start(async () => { await removeMemberAction(m.id); await load(); router.refresh(); })}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-accent-soft hover:text-accent"><X className="size-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-5 flex items-start gap-2 text-xs text-ink-3"><Copy className="mt-0.5 size-3.5 shrink-0" /> O convite só funciona para quem entrar com o mesmo e-mail que você convidou.</p>
      </div>
    </div>,
    document.body,
  );
}
