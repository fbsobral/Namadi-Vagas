"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, FileText, Loader2, PenLine, RefreshCw, Sparkles, Star } from "lucide-react";
import { coverLetterAction, getJobFitAction, jobFitAction } from "@/app/actions";
import type { CvOption } from "./cv-select";
import { fitLabel, type JobFitRow } from "@/lib/resume-shared";
import { ScoreRing } from "./score-ring";
import { useAiFlags } from "./ai-flags";

/** "Seu currículo x esta vaga": compatibilidade, o que falta, currículo adaptado e carta de apresentação. */
export function JobFit({ jobId, cvs, cvId, initial }: { jobId: string; cvs: CvOption[]; cvId: string | null; initial: JobFitRow | null }) {
  const router = useRouter();
  const flags = useAiFlags();
  // currículo comparado: o que a busca da vaga usa; dá para comparar com outro sem mudar a busca
  const [sel, setSel] = useState(cvId ?? cvs.find((c) => c.is_primary)?.id ?? cvs[0]?.id ?? null);
  const [row, setRow] = useState(initial);
  const [letter, setLetter] = useState(initial?.letter ?? null);
  const hasResume = cvs.length > 0;
  const resumeAt = cvs.find((c) => c.id === sel)?.updated_at ?? null;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"fit" | "letter" | null>(null);
  const [, start] = useTransition();

  const runFit = (force: boolean) => {
    setErr(null); setBusy("fit");
    start(async () => {
      const r = await jobFitAction(jobId, force, sel);
      setBusy(null);
      if (!r.ok) return setErr(r.error);
      setRow(r.data);
      router.refresh();
    });
  };
  const runLetter = () => {
    setErr(null); setBusy("letter");
    start(async () => {
      const r = await coverLetterAction(jobId, sel);
      setBusy(null);
      if (!r.ok) return setErr(r.error);
      setLetter(r.data);
    });
  };

  const pick = (id: string) => {
    setSel(id); setErr(null); setRow(null); setLetter(null);
    start(async () => { const r = await getJobFitAction(jobId, id); setRow(r); setLetter(r?.letter ?? null); });
  };

  const fit = row?.fit ?? null;
  // recurso desligado no /admin e nada calculado antes: a seção some
  if (!fit && !flags.fit) return null;
  const stale = !!(fit && resumeAt && row && row.resume_at < resumeAt);

  return (
    <section className="border-t border-line px-5 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-3xl">Seu currículo x esta vaga</h3>
          <p className="mt-1 text-sm text-ink-3">Compatibilidade, o que falta e o currículo adaptado, com IA.</p>
        </div>
        {fit && !fit.quick && flags.fit && <button disabled={!!busy} onClick={() => runFit(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium transition hover:bg-surface-2 disabled:opacity-50"><RefreshCw className={`size-3.5 ${busy === "fit" ? "spin" : ""}`} /> Refazer</button>}
      </div>

      {cvs.length > 1 && (
        <label className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-3">Comparar com</span>
          <select value={sel ?? ""} onChange={(e) => pick(e.target.value)} disabled={!!busy}
            className="min-h-10 max-w-full rounded-full border border-line bg-surface px-3 text-sm font-medium outline-none focus:border-accent">
            {cvs.map((c) => <option key={c.id} value={c.id}>{c.name}{c.id === cvId ? " (desta busca)" : ""}</option>)}
          </select>
        </label>
      )}

      {!hasResume ? (
        <div className="mt-5 rounded-2xl border border-dashed border-line bg-surface/60 p-5 text-center">
          <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-accent-soft text-accent"><FileText className="size-5" /></span>
          <p className="font-semibold">Envie seu currículo uma vez</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">Depois, cada vaga mostra a % de compatibilidade e gera uma carta de apresentação.</p>
          <Link href="/dashboard/curriculo" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg">Ir para Currículo</Link>
        </div>
      ) : !fit ? (
        <button disabled={!!busy} onClick={() => runFit(false)}
          className="mt-5 flex w-full items-center gap-4 rounded-2xl border border-accent/40 bg-accent-soft/60 p-4 text-left transition hover:bg-accent-soft disabled:opacity-70">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">{busy === "fit" ? <Loader2 className="spin size-5" /> : <Sparkles className="size-5" />}</span>
          <span><span className="block font-semibold">{busy === "fit" ? "Comparando com a vaga…" : "Ver compatibilidade"}</span><span className="block text-sm text-ink-2">{busy === "fit" ? "Leva uns 20 segundos." : "Nota de 0 a 100, requisitos que você atende e os que faltam."}</span></span>
        </button>
      ) : (
        <div className="anim-rise mt-5 space-y-5">
          {stale && <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">Seu currículo mudou desde esta comparação. Toque em <strong>Refazer</strong> para atualizar.</p>}
          <div className={`flex items-center gap-4 rounded-2xl border p-4 ${fit.score >= 85 ? "border-ok/40 bg-ok-soft/60" : "border-line bg-surface"}`}>
            <ScoreRing value={fit.score} size={84} suffix="%" />
            <div className="min-w-0">
              {fit.score >= 85
                ? <span className="inline-flex items-center gap-1 rounded-full bg-ok px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase"><Star className="size-3 fill-current" /> Top match</span>
                : <p className="text-sm font-semibold">{fitLabel(fit.score)}</p>}
              {fit.verdict ? <p className="mt-1.5 text-sm text-ink-2">{fit.verdict}</p> : <p className="mt-1.5 text-xs text-ink-3">checagem rápida</p>}
            </div>
          </div>

          {fit.quick && flags.fit && (
            <button disabled={!!busy} onClick={() => runFit(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 p-3.5 text-left transition hover:bg-accent-soft disabled:opacity-70">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">{busy === "fit" ? <Loader2 className="spin size-5" /> : <Sparkles className="size-5" />}</span>
              <span className="min-w-0"><span className="block text-sm font-semibold">{busy === "fit" ? "Fazendo a análise completa…" : "Ver análise completa"}</span><span className="block text-xs text-ink-2">Esta é a checagem rápida. A completa traz dicas e o currículo adaptado para a vaga.</span></span>
            </button>
          )}
          {fit.matched.length > 0 && <Chips title="Você atende" items={fit.matched} tone="ok" />}
          {fit.missing.length > 0 && <Chips title="Falta ou não aparece no seu currículo" items={fit.missing} tone="miss" />}

          {fit.tips.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Como adaptar para esta vaga</p>
              <ul className="space-y-1.5 text-sm text-ink-2">{fit.tips.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent" />{t}</li>)}</ul>
            </div>
          )}

          {(fit.summary || fit.bullets.length > 0) && (
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Currículo adaptado</p>
                <CopyBtn text={[fit.summary, ...fit.bullets.map((b) => `- ${b}`)].filter(Boolean).join("\n\n")} />
              </div>
              {fit.summary && <p className="text-sm whitespace-pre-line text-ink-2">{fit.summary}</p>}
              {fit.bullets.length > 0 && <ul className="mt-3 space-y-1.5 text-sm text-ink-2">{fit.bullets.map((b) => <li key={b} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />{b}</li>)}</ul>}
            </div>
          )}

          {(flags.letter || letter) && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold"><PenLine className="size-4 text-accent" /> Carta de apresentação</p>
              {letter && <CopyBtn text={letter} />}
            </div>
            {letter ? (
              <>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-2">{letter}</p>
                {flags.letter && <button disabled={!!busy} onClick={runLetter} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink disabled:opacity-50"><RefreshCw className={`size-3.5 ${busy === "letter" ? "spin" : ""}`} /> Escrever outra</button>}
              </>
            ) : (
              <button disabled={!!busy} onClick={runLetter} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-bg disabled:opacity-60">
                {busy === "letter" ? <><Loader2 className="spin size-4" /> Escrevendo…</> : <><Sparkles className="size-4" /> Gerar carta</>}
              </button>
            )}
          </div>
          )}
        </div>
      )}
      {err && <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{err}</p>}
    </section>
  );
}

function Chips({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "miss" }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone === "ok" ? "bg-ok-soft text-ok" : "border border-accent/40 bg-accent-soft/60 text-accent"}`}>{tone === "ok" ? "✓ " : "+ "}{t}</span>)}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2">
      {ok ? <><Check className="size-3.5 text-ok" /> Copiado</> : <><Copy className="size-3.5" /> Copiar</>}
    </button>
  );
}
