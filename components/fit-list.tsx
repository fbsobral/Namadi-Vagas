"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Search, Sparkles, Square, SquareCheck, X } from "lucide-react";
import { setAutoFitAction } from "@/app/actions";
import { fitLabel } from "@/lib/resume-shared";
import type { FitJobItem } from "@/lib/db";
import { sourceLabel } from "@/lib/sources";
import { timeAgo } from "@/lib/format";
import { ScoreRing } from "./score-ring";
import { Avatar } from "./avatar";
import { useAiFlags } from "./ai-flags";

type RowState = { score?: number | null; busy?: boolean; error?: string };
const PAGE = 30;
const PARALLEL = 2;
const BATCH = 10;

/** Todas as vagas com a compatibilidade: verificar uma, várias selecionadas ou todas as que faltam. */
export function FitList({ jobs, resumeAt, quota, autoFit }: { jobs: FitJobItem[]; resumeAt: number; quota: { left: number; limit: number }; autoFit: boolean }) {
  const router = useRouter();
  const flags = useAiFlags();
  const can = flags.quickfit;
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"all" | "done" | "todo">("all");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [run, setRun] = useState<{ total: number; done: number; failed: number } | null>(null);
  const [left, setLeft] = useState(quota.left);
  const [msg, setMsg] = useState<string | null>(null);
  const cancel = useRef(false);
  const [auto, setAuto] = useState(autoFit);
  const [, start] = useTransition();

  const score = (j: FitJobItem) => (rows[j.id]?.score !== undefined ? rows[j.id].score : j.fit_score);
  const stale = (j: FitJobItem) => rows[j.id]?.score === undefined && j.fit_score != null && (j.fit_resume_at ?? 0) < (j.cv_updated_at ?? resumeAt);
  const checked = (j: FitJobItem) => score(j) != null && !stale(j);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return jobs
      .filter((j) => (tab === "done" ? checked(j) : tab === "todo" ? !checked(j) : true))
      .filter((j) => !t || `${j.title} ${j.company} ${j.search_name ?? ""}`.toLowerCase().includes(t))
      .sort((a, b) => (score(b) ?? -1) - (score(a) ?? -1) || b.found_at - a.found_at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, rows, tab, q]);

  const nDone = jobs.filter(checked).length;
  const todo = jobs.filter((j) => !checked(j));
  const running = run !== null;

  const verify = async (ids: string[]) => {
    if (!ids.length) return;
    const capped = ids.slice(0, left);
    if (!capped.length) { setMsg(`Você usou as ${quota.limit} verificações de hoje. Volte amanhã.`); return; }
    setMsg(capped.length < ids.length ? `Hoje cabem mais ${capped.length} verificações; verificando as ${capped.length} primeiras.` : null);
    cancel.current = false;
    setRun({ total: capped.length, done: 0, failed: 0 });
    // lotes de 10 (= 1 chamada à IA cada), 2 lotes por vez
    const chunks: string[][] = [];
    for (let i = 0; i < capped.length; i += BATCH) chunks.push(capped.slice(i, i + BATCH));
    const one = async (ids: string[]) => {
      setRows((r) => ({ ...r, ...Object.fromEntries(ids.map((id) => [id, { ...r[id], busy: true, error: undefined }])) }));
      try {
        const force = ids.some((id) => stale(jobs.find((j) => j.id === id)!));
        const res = await fetch("/api/resume/fit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobIds: ids, force }) });
        const json = (await res.json().catch(() => ({}))) as { results?: Record<string, { score?: number; error?: string }>; error?: string };
        if (!res.ok || !json.results) throw new Error(json.error ?? "Não consegui verificar.");
        const results = json.results;
        const failed = ids.filter((id) => results[id]?.error).length;
        setRows((r) => ({ ...r, ...Object.fromEntries(ids.map((id) => [id, results[id]?.error ? { error: results[id].error } : { score: results[id]?.score ?? null }])) }));
        setLeft((n) => Math.max(0, n - (ids.length - failed)));
        setRun((st) => st && { ...st, done: st.done + ids.length, failed: st.failed + failed });
        if (ids.some((id) => /Limite diário/.test(results[id]?.error ?? ""))) { cancel.current = true; setLeft(0); }
      } catch (e) {
        const error = e instanceof Error ? e.message : "Falhou.";
        setRows((r) => ({ ...r, ...Object.fromEntries(ids.map((id) => [id, { error }])) }));
        setRun((st) => st && { ...st, done: st.done + ids.length, failed: st.failed + ids.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, async () => {
      while (chunks.length && !cancel.current) await one(chunks.shift()!);
    }));
    setRun(null);
    setSel(new Set());
    router.refresh();
  };

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const visible = list.slice(0, shown);
  const allVisibleSelected = visible.length > 0 && visible.every((j) => sel.has(j.id));

  return (
    <section className="anim-rise rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-accent uppercase">Compatibilidade</p>
          <h2 className="font-display mt-1 text-3xl">Suas vagas x seu currículo</h2>
          <p className="mt-1 text-sm text-ink-3">{nDone} de {jobs.length} verificadas · checagem rápida, {left} disponíveis hoje</p>
        </div>
        {todo.length > 0 && can && (
          <button disabled={running || left === 0} onClick={() => verify(todo.map((j) => j.id))}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50">
            <Sparkles className="size-4" /> Verificar as {Math.min(todo.length, left) || todo.length} que faltam
          </button>
        )}
      </div>

      {!can && <p className="mt-4 rounded-2xl bg-surface-2/70 px-4 py-3 text-sm text-ink-2">A verificação de compatibilidade está desligada no momento.</p>}
      {flags.autofit && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2/70 px-4 py-3">
        <input type="checkbox" checked={auto} onChange={(e) => { const v = e.target.checked; setAuto(v); start(async () => { await setAutoFitAction(v); }); }} className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span className="text-sm"><strong className="font-medium">Verificar sozinho as vagas novas</strong><span className="block text-xs text-ink-3">Sempre que o robô achar uma vaga, a compatibilidade é calculada e aparece no cartão.</span></span>
      </label>}

      {jobs.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-3">Ainda não há vagas. Crie uma busca e o robô traz as primeiras em instantes.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div role="tablist" className="inline-flex rounded-full border border-line bg-bg p-0.5 text-sm">
              {([["all", `Todas · ${jobs.length}`], ["done", `Verificadas · ${nDone}`], ["todo", `Faltam · ${todo.length}`]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setShown(PAGE); }}
                  className={`rounded-full px-3 py-1.5 whitespace-nowrap transition ${tab === k ? "bg-ink text-bg" : "text-ink-3 hover:text-ink"}`}>{l}</button>
              ))}
            </div>
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Filtrar por vaga ou empresa…" aria-label="Filtrar vagas"
                className="w-full rounded-full border border-line bg-bg py-2 pr-3 pl-9 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15" />
            </div>
          </div>

          {can && <div className="mt-3 flex items-center gap-2 px-1 text-xs text-ink-3">
            <button onClick={() => setSel((s) => { const n = new Set(s); visible.forEach((j) => (allVisibleSelected ? n.delete(j.id) : n.add(j.id))); return n; })}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 hover:text-ink">
              {allVisibleSelected ? <SquareCheck className="size-4 text-accent" /> : <Square className="size-4" />} Selecionar visíveis
            </button>
            {sel.size > 0 && <button onClick={() => setSel(new Set())} className="min-h-9 rounded-full px-2 hover:text-ink">Limpar seleção</button>}
          </div>}

          <ul className="mt-1 space-y-2">
            {visible.map((j) => {
              const st = rows[j.id] ?? {};
              const sc = score(j);
              const old = stale(j);
              return (
                <li key={j.id} className={`flex min-w-0 items-center gap-2.5 rounded-2xl border p-2.5 transition sm:gap-3 sm:p-3 ${sel.has(j.id) ? "border-accent/60 bg-accent-soft/40" : "border-line bg-bg/60"}`}>
                  {can && <button onClick={() => toggle(j.id)} aria-label={`Selecionar ${j.title}`} aria-pressed={sel.has(j.id)} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:text-ink">
                    {sel.has(j.id) ? <SquareCheck className="size-5 text-accent" /> : <Square className="size-5" />}
                  </button>}
                  {st.busy ? <span className="grid size-11 shrink-0 place-items-center"><Loader2 className="spin size-5 text-accent" /></span>
                    : sc != null ? <ScoreRing value={sc} size={44} suffix="%" className={old ? "opacity-50" : ""} />
                    : <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-dashed border-line text-xs text-ink-3">—</span>}
                  <span className="hidden sm:block"><Avatar name={j.company} size={34} /></span>
                  <Link href={`/dashboard?job=${j.id}`} scroll={false} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold hover:text-accent">{j.title}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {j.company} · {sourceLabel(j.source)}
                      {st.error ? <span className="text-accent"> · {st.error}</span>
                        : sc != null ? <> · {old ? "currículo mudou" : fitLabel(sc).toLowerCase()}</>
                        : <> · encontrada {timeAgo(j.found_at)}</>}
                    </span>
                  </Link>
                  {can && (sc == null || old || st.error) ? (
                    <button disabled={running || st.busy || left === 0} onClick={() => verify([j.id])}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium transition hover:bg-surface-2 disabled:opacity-50">
                      <Sparkles className="size-3.5" /> <span className="hidden sm:inline">{old ? "Atualizar" : "Verificar"}</span><span className="sr-only sm:hidden">Verificar</span>
                    </button>
                  ) : (
                    <Link href={`/dashboard?job=${j.id}`} scroll={false} aria-label="Abrir vaga" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><ArrowRight className="size-4" /></Link>
                  )}
                </li>
              );
            })}
          </ul>
          {list.length === 0 && <p className="mt-3 rounded-2xl border border-dashed border-line px-5 py-6 text-center text-sm text-ink-3">Nenhuma vaga com esse filtro.</p>}
          {list.length > shown && (
            <button onClick={() => setShown((n) => n + PAGE)} className="mt-3 w-full rounded-full border border-line py-2.5 text-sm font-medium transition hover:bg-surface-2">Mostrar mais {Math.min(PAGE, list.length - shown)}</button>
          )}
        </>
      )}

      {msg && <p role="status" className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{msg}</p>}

      {/* barra de ação: aparece ao selecionar ou durante a verificação */}
      {(sel.size > 0 || running) && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 pt-2 sm:sticky sm:bottom-4 sm:mt-4 sm:px-0 sm:pt-0">
          <div className="anim-pop mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-ink p-3 text-bg shadow-pop sm:rounded-full sm:pl-5">
            {running ? (
              <>
                <Loader2 className="spin size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Verificando {run.done} de {run.total}{run.failed ? ` · ${run.failed} com erro` : ""}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg/20"><span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${(run.done / run.total) * 100}%` }} /></div>
                </div>
                <button onClick={() => { cancel.current = true; }} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-bg/15 px-4 text-sm font-medium hover:bg-bg/25"><X className="size-4" /> Parar</button>
              </>
            ) : (
              <>
                <p className="min-w-0 flex-1 text-sm whitespace-nowrap"><strong>{sel.size}</strong> {sel.size === 1 ? "selecionada" : "selecionadas"}</p>
                <button onClick={() => setSel(new Set())} className="hidden min-h-10 shrink-0 rounded-full px-3 text-sm text-bg/70 hover:text-bg sm:block">Limpar</button>
                <button disabled={left === 0} onClick={() => verify([...sel])} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-50">
                  <Check className="size-4" /> Verificar<span className="hidden sm:inline"> compatibilidade</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
