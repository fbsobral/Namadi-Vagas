"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, LogOut, Mail, Pause, Pencil, Play, RefreshCw, Share2, Trash2 } from "lucide-react";
import { leaveSharedSearch, removeSearch, runNow, seeAll, setMyNotifyAction, toggleSearch } from "@/app/actions";
import { SearchDialog } from "./search-dialog";
import { ShareDialog } from "./share-dialog";
import type { Search } from "@/lib/types";
import { canManage, roleLabel, type Role } from "@/lib/roles";

/** Barra de quem pode editar: a dona, ou convidados com "Pode editar"/"Pode gerenciar". */
export function SearchToolbar({ search, unseen, role = "owner", ownerName = null }: { search: Search; unseen: number; role?: Role; ownerName?: string | null }) {
  const owner = role === "owner";
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState(false);
  const [share, setShare] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const attempt = (fn: () => Promise<void>) =>
    start(async () => {
      try { await fn(); } catch { setConfirm(false); setMsg("Não consegui falar com o servidor. Tente de novo."); setTimeout(() => setMsg(null), 5000); }
    });
  const running = pending || search.last_status === "running";

  const btn = "inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium whitespace-nowrap transition hover:bg-surface-2 disabled:opacity-50 sm:py-2";

  return (
    <div className="scroll-thin -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {!owner && <SharedBadge ownerName={ownerName} role={role} />}
      <button className={`${btn} !border-ink !bg-ink !text-bg hover:!opacity-85`} disabled={running} onClick={() =>
        attempt(async () => {
          setMsg(null);
          const r = await runNow(search.id);
          setMsg(r.error ? r.error : r.added ? `${r.added} vaga${r.added > 1 ? "s" : ""} nova${r.added > 1 ? "s" : ""}` : "Nada novo por enquanto");
          setTimeout(() => setMsg(null), 4000);
        })}>
        <RefreshCw className={`size-4 ${running ? "spin" : ""}`} /> {running ? "Buscando…" : "Rodar agora"}
      </button>
      <button className={btn} onClick={() => attempt(async () => { await toggleSearch(search.id, !search.active); })}>
        {search.active ? <><Pause className="size-4" /> Pausar</> : <><Play className="size-4" /> Retomar</>}
      </button>
      <button className={btn} onClick={() => setEdit(true)}><Pencil className="size-4" /> Editar</button>
      {canManage(role) && <button className={btn} onClick={() => setShare(true)}><Share2 className="size-4" /> Compartilhar{(search.shared_count ?? 0) > 0 ? <span className="rounded-full bg-accent-soft px-1.5 text-xs text-accent">{search.shared_count}</span> : null}</button>}
      {unseen > 0 && <button className={btn} onClick={() => attempt(async () => { await seeAll(search.id); })}><CheckCheck className="size-4" /> Marcar vistas</button>}
      {!owner && <MyEmail search={search} />}
      {!owner ? <LeaveButton searchId={search.id} /> : confirm ? (
        <span className="anim-pop inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pr-1 pl-4 text-sm text-accent">
          Excluir busca e vagas?
          <button className="rounded-full bg-accent px-3 py-1 font-medium text-accent-ink" onClick={() => attempt(async () => { await removeSearch(search.id); router.push("/dashboard"); })}>Excluir</button>
          <button className="rounded-full px-3 py-1" onClick={() => setConfirm(false)}>Não</button>
        </span>
      ) : (
        <button className={`${btn} text-ink-3 hover:text-accent`} onClick={() => setConfirm(true)} aria-label="Excluir busca"><Trash2 className="size-4" /></button>
      )}
      {msg && <span role="status" className="anim-pop text-sm text-ink-2">{msg}</span>}
      <SearchDialog open={edit} onClose={() => setEdit(false)} initial={search} />
      {share && <ShareDialog searchId={search.id} searchName={search.name} onClose={() => setShare(false)} />}
    </div>
  );
}

const chipBtn = "inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium whitespace-nowrap transition hover:bg-surface-2 disabled:opacity-50 sm:py-2";

function SharedBadge({ ownerName, role }: { ownerName: string | null; role: Role }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-2 text-sm whitespace-nowrap text-accent">
      de <strong className="font-semibold">{ownerName ?? "alguém"}</strong><span className="opacity-60">·</span>{roleLabel(role).toLowerCase()}
    </span>
  );
}

/** Cada convidado escolhe como recebe as vagas novas desta busca. */
function MyEmail({ search }: { search: Search }) {
  const [pending, start] = useTransition();
  return (
    <label className={`${chipBtn} cursor-pointer`}>
      <Mail className="size-4" />
      <span className="sr-only sm:not-sr-only">E-mail:</span>
      <select aria-label="Receber e-mail das vagas novas" defaultValue={search.my_notify ?? "run"} disabled={pending}
        onChange={(e) => start(async () => { await setMyNotifyAction(search.id, e.target.value as "off" | "run" | "daily"); })}
        className="cursor-pointer bg-transparent pr-1 font-medium outline-none">
        <option value="run">a cada rodada</option>
        <option value="daily">resumo diário (8h)</option>
        <option value="off">desligado</option>
      </select>
    </label>
  );
}

function LeaveButton({ searchId }: { searchId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <span className="anim-pop inline-flex shrink-0 items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pr-1 pl-4 text-sm whitespace-nowrap text-accent">
      Sair desta busca?
      <button disabled={pending} className="rounded-full bg-accent px-3 py-1 font-medium text-accent-ink" onClick={() => start(async () => { await leaveSharedSearch(searchId); router.push("/dashboard"); })}>Sair</button>
      <button className="rounded-full px-3 py-1" onClick={() => setConfirm(false)}>Não</button>
    </span>
  ) : (
    <button className={`${chipBtn} text-ink-3 hover:text-accent`} onClick={() => setConfirm(true)}><LogOut className="size-4" /> Sair da busca</button>
  );
}

/** Barra de quem só pode ver: acompanha a busca, mas quem administra é a dona (ou quem gerencia). */
export function SharedToolbar({ search, unseen, ownerName }: { search: Search; unseen: number; ownerName: string | null }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SharedBadge ownerName={ownerName} role="viewer" />
      {unseen > 0 && <button className={chipBtn} disabled={pending} onClick={() => start(async () => { await seeAll(search.id); })}><CheckCheck className="size-4" /> Marcar vistas</button>}
      <MyEmail search={search} />
      <LeaveButton searchId={search.id} />
    </div>
  );
}
