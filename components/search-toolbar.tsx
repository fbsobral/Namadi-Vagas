"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, LogOut, Pause, Pencil, Play, RefreshCw, Share2, Trash2 } from "lucide-react";
import { leaveSharedSearch, removeSearch, runNow, seeAll, toggleSearch } from "@/app/actions";
import { SearchDialog } from "./search-dialog";
import { ShareDialog } from "./share-dialog";
import type { Search } from "@/lib/types";

export function SearchToolbar({ search, unseen }: { search: Search; unseen: number }) {
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
      <button className={btn} onClick={() => setShare(true)}><Share2 className="size-4" /> Compartilhar{(search.shared_count ?? 0) > 0 ? <span className="rounded-full bg-accent-soft px-1.5 text-xs text-accent">{search.shared_count}</span> : null}</button>
      {unseen > 0 && <button className={btn} onClick={() => attempt(async () => { await seeAll(search.id); })}><CheckCheck className="size-4" /> Marcar vistas</button>}
      {confirm ? (
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

/** Barra do convidado: ele só acompanha a busca; quem administra é a dona. */
export function SharedToolbar({ search, unseen, ownerName }: { search: Search; unseen: number; ownerName: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const btn = "inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium whitespace-nowrap transition hover:bg-surface-2 disabled:opacity-50 sm:py-2";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-2 text-sm text-accent">Compartilhada por <strong className="font-semibold">{ownerName ?? "alguém"}</strong></span>
      {unseen > 0 && <button className={btn} disabled={pending} onClick={() => start(async () => { await seeAll(search.id); })}><CheckCheck className="size-4" /> Marcar vistas</button>}
      {confirm ? (
        <span className="anim-pop inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pr-1 pl-4 text-sm text-accent">
          Sair desta busca?
          <button className="rounded-full bg-accent px-3 py-1 font-medium text-accent-ink" onClick={() => start(async () => { await leaveSharedSearch(search.id); router.push("/dashboard"); })}>Sair</button>
          <button className="rounded-full px-3 py-1" onClick={() => setConfirm(false)}>Não</button>
        </span>
      ) : (
        <button className={`${btn} text-ink-3 hover:text-accent`} onClick={() => setConfirm(true)}><LogOut className="size-4" /> Sair da busca</button>
      )}
    </div>
  );
}
