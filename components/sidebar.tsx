"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plus, Star, Layers, X, Columns3 } from "lucide-react";
import { Logo } from "./logo";
import { SearchDialog } from "./search-dialog";
import { freqLabel } from "@/lib/sources";
import type { Search } from "@/lib/types";

type Props = {
  searches: Search[];
  counts: { total: number; unseen: number; favs: number };
  currentId: string | null;
  filter: string;
  view?: "list" | "board";
  robotOnline?: boolean;
  children: React.ReactNode; // UserButton
};

export function Sidebar({ searches, counts, currentId, filter, view = "list", robotOnline, children }: Props) {
  const [mobile, setMobile] = useState(false);
  const [dialog, setDialog] = useState(false);
  const mine = searches.filter((s) => s.is_owner !== false);
  const shared = searches.filter((s) => s.is_owner === false);
  const allActive = !currentId && view === "list" && filter !== "fav";
  const favActive = !currentId && view === "list" && filter === "fav";
  const boardActive = !currentId && view === "board";

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Link href="/dashboard"><Logo /></Link>
        <button className="lg:hidden" onClick={() => setMobile(false)} aria-label="Fechar menu"><X className="size-5" /></button>
      </div>

      <nav className="space-y-1 px-3" onClick={() => setMobile(false)}>
        <NavItem href="/dashboard" active={allActive} icon={<Layers className="size-4" />} label="Todas as vagas" badge={counts.unseen} />
        <NavItem href="/dashboard?v=board" active={boardActive} icon={<Columns3 className="size-4" />} label="Kanban" count={counts.favs} />
        <NavItem href="/dashboard?f=fav" active={favActive} icon={<Star className="size-4" />} label="Favoritas" count={counts.favs} />
      </nav>

      <div className="mt-7 flex items-center justify-between px-5">
        <p className="text-[11px] font-medium tracking-wider text-ink-3 uppercase">Minhas buscas</p>
        <button onClick={() => { setDialog(true); setMobile(false); }} className="grid size-7 place-items-center rounded-full bg-ink text-bg transition hover:bg-accent hover:text-accent-ink" aria-label="Nova busca"><Plus className="size-4" /></button>
      </div>

      <div className="scroll-thin mt-2 flex-1 overflow-y-auto px-3 pb-4" onClick={() => setMobile(false)}>
        <div className="space-y-0.5">
          {mine.map((s) => <SearchLink key={s.id} s={s} active={s.id === currentId} view={view} />)}
          {mine.length === 0 && (
            <button onClick={() => setDialog(true)} className="w-full rounded-2xl border border-dashed border-line p-4 text-left text-sm text-ink-3 transition hover:border-accent hover:text-accent">
              Crie sua primeira busca →
            </button>
          )}
        </div>

        {shared.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 px-2 text-[11px] font-medium tracking-wider text-ink-3 uppercase">Compartilhadas comigo</p>
            <div className="space-y-0.5">{shared.map((s) => <SearchLink key={s.id} s={s} active={s.id === currentId} view={view} />)}</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-line px-5 py-4">{children}</div>
    </div>
  );

  return (
    <>
      <div className="pt-safe sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size={24} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-ink-2" title={robotOnline ? "Robô online" : "Robô parado"}>
          <span className={`size-2 rounded-full ${robotOnline ? "pulse-dot bg-ok" : "bg-accent"}`} style={{ ["--dot" as string]: robotOnline ? "var(--ok)" : "var(--accent)" }} />
          {robotOnline ? "online" : "parado"}
        </span>
        <button onClick={() => setMobile(true)} aria-label="Abrir menu" className="grid size-11 place-items-center rounded-full border border-line bg-surface"><Menu className="size-5" /></button>
      </div>

      <aside className="sticky top-0 hidden h-dvh w-[290px] shrink-0 border-r border-line bg-surface-2/50 lg:block">{nav}</aside>

      {mobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="anim-fade absolute inset-0 bg-ink/50" onClick={() => setMobile(false)} />
          <aside className="anim-slide absolute inset-y-0 left-0 w-[300px] max-w-[85vw] bg-bg" style={{ animationName: "fade" }}>{nav}</aside>
        </div>
      )}

      <SearchDialog open={dialog} onClose={() => setDialog(false)} />
    </>
  );
}

function SearchLink({ s, active, view }: { s: Search; active: boolean; view: "list" | "board" }) {
  const running = s.last_status === "running";
  const sharedWithMe = s.is_owner === false;
  return (
    <Link href={`/dashboard?s=${s.id}${view === "board" ? "&v=board" : ""}`} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? "bg-surface shadow-card" : "hover:bg-surface/60"}`}>
      <span className={`size-2.5 shrink-0 rounded-full ${running ? "pulse-dot" : ""} ${s.active ? "" : "opacity-30"}`} style={{ background: s.color, ["--dot" as string]: s.color }} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${active ? "font-medium" : "text-ink-2 group-hover:text-ink"}`}>{s.name}</span>
        <span className="block truncate text-xs text-ink-3">
          {sharedWithMe ? `de ${s.owner_name ?? "alguém"}` : !s.active ? "pausada" : running ? "buscando agora…" : freqLabel(s.freq_minutes)}
          {!sharedWithMe && (s.shared_count ?? 0) > 0 ? ` · com ${s.shared_count} ${s.shared_count === 1 ? "pessoa" : "pessoas"}` : ""}
        </span>
      </span>
      {(s.unseen ?? 0) > 0 && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] leading-none font-semibold text-accent-ink">{s.unseen}</span>}
    </Link>
  );
}

function NavItem({ href, active, icon, label, count, badge }: { href: string; active: boolean; icon: React.ReactNode; label: string; count?: number; badge?: number }) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-surface font-medium shadow-card" : "text-ink-2 hover:bg-surface/60 hover:text-ink"}`}>
      <span className={active ? "text-accent" : ""}>{icon}</span>
      <span className="flex-1">{label}</span>
      {count !== undefined && count > 0 && <span className="font-mono text-xs text-ink-3">{count}</span>}
      {!!badge && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] leading-none font-semibold text-accent-ink">{badge}</span>}
    </Link>
  );
}
