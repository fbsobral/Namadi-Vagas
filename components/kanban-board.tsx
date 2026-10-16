"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, GripVertical } from "lucide-react";
import { moveJobStage } from "@/app/actions";
import { STAGES, type StageKey } from "@/lib/stages";
import { sourceLabel } from "@/lib/sources";
import { Avatar } from "./avatar";
import type { Job } from "@/lib/types";

type Board = Record<StageKey, Job[]>;

const group = (jobs: Job[]): Board => {
  const b = Object.fromEntries(STAGES.map((s) => [s.key, [] as Job[]])) as Board;
  for (const j of jobs) (b[(j.stage as StageKey) in b ? (j.stage as StageKey) : "todo"]).push(j);
  return b;
};

export function KanbanBoard({ jobs, hrefs, showSearch }: { jobs: Job[]; hrefs: Record<string, string>; showSearch: boolean }) {
  const [board, setBoard] = useState<Board>(() => group(jobs));
  const [sig, setSig] = useState(() => jobs.map((j) => j.id + j.stage + j.stage_pos).join());
  const [drag, setDrag] = useState<{ id: string; from: StageKey } | null>(null);
  const [over, setOver] = useState<{ stage: StageKey; index: number } | null>(null);
  const [, start] = useTransition();

  // sincroniza com o servidor quando os dados mudam (ex.: favoritou em outra aba)
  const next = jobs.map((j) => j.id + j.stage + j.stage_pos).join();
  if (next !== sig) { setSig(next); setBoard(group(jobs)); }

  const move = (id: string, to: StageKey, index: number) => {
    setBoard((prev) => {
      const nb = Object.fromEntries(STAGES.map((s) => [s.key, [...prev[s.key]]])) as Board;
      let job: Job | undefined;
      for (const s of STAGES) {
        const i = nb[s.key].findIndex((j) => j.id === id);
        if (i >= 0) { [job] = nb[s.key].splice(i, 1); break; }
      }
      if (!job) return prev;
      nb[to].splice(Math.min(index, nb[to].length), 0, { ...job, stage: to });
      return nb;
    });
    start(async () => { await moveJobStage(id, to, index); });
  };

  const total = jobs.length;

  return (
    <div>
      {total === 0 && (
        <div className="anim-rise mb-5 rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-4 text-sm text-ink-2">
          <strong>Seu quadro está vazio.</strong> Favorite uma vaga (★) na lista e ela entra aqui em <em>A candidatar</em>. Depois é só arrastar entre as etapas.
        </div>
      )}
      <div className="scroll-thin -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-6 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
        {STAGES.map((st) => {
          const items = board[st.key];
          const active = over?.stage === st.key;
          return (
            <section
              key={st.key}
              aria-label={st.label}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                // posição de inserção pelo ponto médio dos cards
                const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]")].filter((c) => c.dataset.card !== drag.id);
                let index = cards.length;
                for (let i = 0; i < cards.length; i++) {
                  const r = cards[i].getBoundingClientRect();
                  if (e.clientY < r.top + r.height / 2) { index = i; break; }
                }
                if (over?.stage !== st.key || over.index !== index) setOver({ stage: st.key, index });
              }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o?.stage === st.key ? null : o)); }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag && over) move(drag.id, over.stage, over.index);
                setDrag(null); setOver(null);
              }}
              className={`flex max-h-[calc(100dvh-14rem)] min-h-[320px] w-[290px] shrink-0 snap-start flex-col rounded-3xl border bg-surface-2/60 p-3 transition ${active ? "border-accent bg-accent-soft/40" : "border-line"}`}
            >
              <header className="mb-3 flex items-start justify-between gap-2 px-2 pt-1">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="size-2.5 rounded-full" style={{ background: st.color }} />{st.label}</h3>
                  <p className="mt-0.5 text-xs text-ink-3">{st.hint}</p>
                </div>
                <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-xs text-ink-2">{items.length}</span>
              </header>

              <div className="scroll-thin flex flex-1 flex-col gap-2.5 overflow-y-auto px-0.5 pb-1">
                {items.map((j, i) => (
                  <div key={j.id} className="contents">
                    {active && over?.index === i && drag?.id !== j.id && <DropLine />}
                    <Card job={j} href={hrefs[j.id]} showSearch={showSearch} dragging={drag?.id === j.id}
                      onDragStart={() => setDrag({ id: j.id, from: st.key })} onDragEnd={() => { setDrag(null); setOver(null); }}
                      onMove={(to) => move(j.id, to, 0)} stage={st.key} />
                  </div>
                ))}
                {active && over && over.index >= items.filter((j) => j.id !== drag?.id).length && <DropLine />}
                {items.length === 0 && !active && <p className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line px-4 py-8 text-center text-xs text-ink-3">Arraste uma vaga para cá</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DropLine() {
  return <div className="h-1 shrink-0 rounded-full bg-accent" />;
}

function Card({ job, href, showSearch, dragging, onDragStart, onDragEnd, onMove, stage }: {
  job: Job; href: string; showSearch: boolean; dragging: boolean; stage: StageKey;
  onDragStart: () => void; onDragEnd: () => void; onMove: (to: StageKey) => void;
}) {
  return (
    <article
      data-card={job.id}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", job.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      className={`group relative cursor-grab rounded-2xl border border-line bg-surface p-3.5 shadow-card transition active:cursor-grabbing ${dragging ? "scale-[.98] opacity-40" : "hover:-translate-y-0.5 hover:shadow-pop"}`}
    >
      <div className="flex gap-3">
        <Avatar name={job.company} size={36} />
        <div className="min-w-0 flex-1">
          <Link href={href} scroll={false} draggable={false} className="line-clamp-2 text-sm leading-snug font-semibold hover:text-accent">{job.title}</Link>
          <p className="mt-0.5 truncate text-xs text-ink-2">{job.company}</p>
        </div>
        <GripVertical className="size-4 shrink-0 text-ink-3 opacity-0 transition group-hover:opacity-100" aria-hidden />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium text-ink-2">{sourceLabel(job.source)}</span>
        {showSearch && <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-ink-2"><span className="size-1.5 rounded-full" style={{ background: job.search_color }} />{job.search_name}</span>}
        {job.contacts_status === "done" && <span className="text-ok">contatos ✓</span>}
        {job.contacts_status === "pending" && <span className="text-accent">buscando…</span>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        {/* alternativa ao arrastar (celular/teclado) */}
        <label className="sr-only" htmlFor={`mv-${job.id}`}>Mover para</label>
        <select id={`mv-${job.id}`} value={stage} onChange={(e) => onMove(e.target.value as StageKey)}
          className="max-w-[150px] cursor-pointer rounded-lg border border-line bg-bg px-2 py-1 text-xs text-ink-2 outline-none focus:border-accent">
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <a href={job.url} target="_blank" rel="noopener noreferrer" draggable={false} aria-label="Abrir vaga em nova aba" className="grid size-7 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink"><ArrowUpRight className="size-4" /></a>
      </div>
    </article>
  );
}
