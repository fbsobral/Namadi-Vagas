"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Pause, Pencil, Play, RefreshCw, Trash2 } from "lucide-react";
import { removeSearch, runNow, seeAll, toggleSearch } from "@/app/actions";
import { SearchDialog } from "./search-dialog";
import type { Search } from "@/lib/types";

export function SearchToolbar({ search, unseen }: { search: Search; unseen: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const running = pending || search.last_status === "running";

  const btn = "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={`${btn} !border-ink !bg-ink !text-bg hover:!opacity-85`} disabled={running} onClick={() =>
        start(async () => {
          setMsg(null);
          const r = await runNow(search.id);
          setMsg(r.error ? r.error : r.added ? `${r.added} vaga${r.added > 1 ? "s" : ""} nova${r.added > 1 ? "s" : ""}` : "Nada novo por enquanto");
          setTimeout(() => setMsg(null), 4000);
        })}>
        <RefreshCw className={`size-4 ${running ? "spin" : ""}`} /> {running ? "Buscando…" : "Rodar agora"}
      </button>
      <button className={btn} onClick={() => start(async () => { await toggleSearch(search.id, !search.active); })}>
        {search.active ? <><Pause className="size-4" /> Pausar</> : <><Play className="size-4" /> Retomar</>}
      </button>
      <button className={btn} onClick={() => setEdit(true)}><Pencil className="size-4" /> Editar</button>
      {unseen > 0 && <button className={btn} onClick={() => start(async () => { await seeAll(search.id); })}><CheckCheck className="size-4" /> Marcar vistas</button>}
      {confirm ? (
        <span className="anim-pop inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pr-1 pl-4 text-sm text-accent">
          Excluir busca e vagas?
          <button className="rounded-full bg-accent px-3 py-1 font-medium text-accent-ink" onClick={() => start(async () => { await removeSearch(search.id); router.push("/dashboard"); })}>Excluir</button>
          <button className="rounded-full px-3 py-1" onClick={() => setConfirm(false)}>Não</button>
        </span>
      ) : (
        <button className={`${btn} text-ink-3 hover:text-accent`} onClick={() => setConfirm(true)} aria-label="Excluir busca"><Trash2 className="size-4" /></button>
      )}
      {msg && <span role="status" className="anim-pop text-sm text-ink-2">{msg}</span>}
      <SearchDialog open={edit} onClose={() => setEdit(false)} initial={search} />
    </div>
  );
}
