"use client";

import { useRef, useState } from "react";
import { Check, FileText, Loader2, Sparkles, Undo2 } from "lucide-react";
import { createSearch } from "@/app/actions";
import { specToBoolean } from "@/lib/query";
import type { CvAnalysis, CvSuggestion } from "@/lib/cv";

type Phase = { t: "idle" } | { t: "reading"; name: string } | { t: "error"; msg: string } | { t: "done"; data: CvAnalysis };

export function CvFill({ onApply, onUndo, canUndo, onCreated }: {
  onApply: (s: CvSuggestion) => void;
  onUndo: () => void;
  canUndo: boolean;
  onCreated: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ t: "idle" });
  const [drag, setDrag] = useState(false);
  const [created, setCreated] = useState<Record<number, "busy" | "ok" | string>>({});

  const read = async (file: File) => {
    setCreated({});
    setPhase({ t: "reading", name: file.name });
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/cv", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as (CvAnalysis & { error?: string }) | null;
      if (!res.ok || !json || json.error) throw new Error(json?.error ?? "Não consegui ler o currículo.");
      setPhase({ t: "done", data: json });
      onApply(json.searches[0]);
    } catch (e) {
      setPhase({ t: "error", msg: e instanceof Error ? e.message : "Não consegui ler o currículo." });
    }
  };

  const createExtra = async (i: number, s: CvSuggestion) => {
    setCreated((c) => ({ ...c, [i]: "busy" }));
    try {
      await createSearch({ name: s.name, spec: s.spec, location: s.location, sources: ["linkedin", "gupy"], recency: s.recency, freq_minutes: 360, notify_mode: "off" });
      setCreated((c) => ({ ...c, [i]: "ok" }));
      onCreated();
    } catch (e) {
      setCreated((c) => ({ ...c, [i]: e instanceof Error ? e.message : "Falhou" }));
    }
  };

  const pick = (f?: File | null) => { if (f) void read(f); if (input.current) input.current.value = ""; };

  return (
    <div className="mt-5">
      <input ref={input} type="file" accept=".pdf,.docx,.txt,.md,application/pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label="Enviar currículo" />

      {phase.t === "idle" || phase.t === "error" ? (
        <button type="button" onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          className={`group flex w-full items-center gap-4 rounded-2xl border border-dashed p-4 text-left transition ${drag ? "border-accent bg-accent-soft" : "border-line bg-bg hover:border-accent hover:bg-accent-soft/50"}`}>
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Sparkles className="size-5" /></span>
          <span className="min-w-0">
            <span className="block font-medium">Preencher com meu currículo</span>
            <span className="block text-[13px] text-ink-3">A IA lê seu CV e monta as palavras-chave, o local e as exclusões. PDF, DOCX ou TXT, até 5 MB. O arquivo não é guardado.</span>
          </span>
        </button>
      ) : null}

      {phase.t === "error" && <p role="alert" className="mt-2 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent">{phase.msg}</p>}

      {phase.t === "reading" && (
        <div aria-busy="true" className="flex items-center gap-4 rounded-2xl border border-line bg-bg p-4">
          <Loader2 className="spin size-6 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="truncate font-medium">Lendo {phase.name}…</p>
            <p className="text-[13px] text-ink-3">Costuma levar uns 10 a 20 segundos.</p>
          </div>
        </div>
      )}

      {phase.t === "done" && (
        <div className="anim-pop rounded-2xl border border-accent/30 bg-accent-soft/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <p className="flex items-center gap-2 font-medium"><Check className="size-4 text-ok" /> Formulário preenchido a partir do seu CV</p>
            <div className="flex shrink-0 gap-1.5">
              {canUndo && <button type="button" onClick={onUndo} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium transition hover:bg-surface-2"><Undo2 className="size-3.5" /> Desfazer</button>}
              <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium transition hover:bg-surface-2"><FileText className="size-3.5" /> Outro CV</button>
            </div>
          </div>

          <p className="mt-3 text-sm text-ink-2">
            <strong className="font-semibold text-ink">{phase.data.profile.role || "Cargo não identificado"}</strong>
            {phase.data.profile.seniority && ` · ${phase.data.profile.seniority}`}
            {phase.data.profile.years > 0 && ` · ${phase.data.profile.years} anos`}
            {phase.data.profile.city && ` · ${phase.data.profile.city}`}
          </p>
          {phase.data.profile.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">{phase.data.profile.skills.map((s) => <span key={s} className="rounded-full bg-surface px-2.5 py-1 text-xs text-ink-2">{s}</span>)}</div>
          )}
          <p className="mt-3 text-[13px] text-ink-3">{phase.data.searches[0].why}</p>
          <p className="mt-1 text-xs text-ink-3">Confira e ajuste abaixo antes de salvar. Nada é criado até você clicar em “Criar”.</p>

          {phase.data.searches.length > 1 && (
            <div className="mt-4 space-y-2 border-t border-accent/20 pt-3">
              <p className="text-xs font-medium tracking-wider text-ink-3 uppercase">Variações que o seu CV sustenta</p>
              {phase.data.searches.slice(1).map((s, k) => {
                const i = k + 1;
                const st = created[i];
                return (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate font-mono text-xs text-ink-3" title={specToBoolean(s.spec)}>{specToBoolean(s.spec)}</p>
                      <p className="mt-0.5 text-xs text-ink-3">{s.why}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button type="button" onClick={() => onApply(s)} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium transition hover:bg-surface-2">Usar no formulário</button>
                      <button type="button" disabled={st === "busy" || st === "ok"} onClick={() => createExtra(i, s)}
                        className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-60">
                        {st === "busy" ? "Criando…" : st === "ok" ? "Criada ✓" : "Criar também"}
                      </button>
                    </div>
                    {st && st !== "busy" && st !== "ok" && <p className="w-full text-xs text-accent">{st}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
