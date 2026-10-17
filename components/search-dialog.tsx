"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, Clock, MapPin, X } from "lucide-react";
import { createSearch, editSearch, type SearchInput } from "@/app/actions";
import { buildGoogleQuery, FREQUENCIES, RECENCY, SOURCES } from "@/lib/sources";
import { emptySpec, hasTerms, parseSpec, specToBoolean, specToQuery } from "@/lib/query";
import { QueryBuilder } from "./query-builder";
import { EmailSettings } from "./email-settings";
import { CvFill } from "./cv-fill";
import type { Search } from "@/lib/types";

export function SearchDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Search | null }) {
  // Monta o corpo só quando aberto: o estado do formulário nasce limpo a cada abertura.
  return open ? <DialogBody onClose={onClose} initial={initial} /> : null;
}

function DialogBody({ onClose, initial }: { onClose: () => void; initial?: Search | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [before, setBefore] = useState<SearchInput | null>(null); // para "Desfazer" o preenchimento pelo CV
  const [f, setF] = useState<SearchInput>(() =>
    initial
      ? { name: initial.name, spec: parseSpec(initial.query_spec, initial.query), location: initial.location, sources: JSON.parse(initial.sources), recency: initial.recency, freq_minutes: initial.freq_minutes, notify_mode: initial.notify_mode ?? "off" }
      : blank(),
  );

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  const googleQ = useMemo(() => buildGoogleQuery(specToQuery(f.spec) || "…", f.location, ["web"]), [f]);
  const boolQ = useMemo(() => specToBoolean(f.spec) || "…", [f]);
  const perMonth = Math.round((30 * 24 * 60) / f.freq_minutes);
  const set = <K extends keyof SearchInput>(k: K, v: SearchInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggleSource = (k: string) =>
    set("sources", f.sources.includes(k) ? f.sources.filter((x) => x !== k) : [...f.sources, k]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        if (initial) {
          await editSearch(initial.id, f);
        } else {
          const id = await createSearch(f);
          router.push(`/dashboard?s=${id}`);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Algo deu errado");
      }
    });
  };

  // Portal no <body>: ancestrais com transform/animação "prendem" o position:fixed e cortam o modal.
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center">
      <div className="anim-fade absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="anim-pop scroll-thin relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-line bg-surface px-5 pt-6 text-left shadow-pop sm:rounded-[28px] sm:px-8 sm:pt-8">
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute top-5 right-5 grid size-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink"><X className="size-5" /></button>
        <p className="text-xs font-medium tracking-wider text-accent uppercase">{initial ? "Editar busca" : "Nova busca"}</p>
        <h2 className="font-display mt-1 pr-10 text-3xl sm:text-4xl">{initial ? "Ajuste o radar" : "O que você procura?"}</h2>

        <CvFill
          canUndo={before !== null}
          onUndo={() => { if (before) setF(before); setBefore(null); }}
          onApply={(sug) => { setBefore((b) => b ?? f); setF((p) => ({ ...p, name: sug.name, spec: sug.spec, location: sug.location, recency: sug.recency })); }}
          onCreated={() => router.refresh()}
        />

        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-medium">Nome da busca <span className="text-ink-3">(opcional)</span></span>
          <input autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Como aparece na barra lateral — se vazio, usa a 1ª palavra-chave" className="w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15" />
        </label>

        <div className="mt-5"><QueryBuilder spec={f.spec} onChange={(spec) => set("spec", spec)} /></div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium">Local</span>
          <div className="relative">
            <MapPin className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
            <input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="São Paulo, remoto…" className="w-full rounded-xl border border-line bg-bg py-3 pr-4 pl-10 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15" />
          </div>
        </label>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-medium">Onde o robô procura</legend>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => {
              const on = f.sources.includes(s.key);
              return (
                <button type="button" key={s.key} aria-pressed={on} onClick={() => toggleSource(s.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:border-ink-3"}`}>
                  {on && <Check className="size-3.5" />}{s.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-3">LinkedIn e Gupy são lidos direto: rápido, sem CAPTCHA. Google aberto cobre qualquer outro site, mas é mais lento e pode pedir CAPTCHA.</p>
        </fieldset>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Segment label="Vagas publicadas nos últimos" value={f.recency} onChange={(v) => set("recency", v as SearchInput["recency"])} options={RECENCY.map((r) => ({ v: r.key, l: r.label }))} />
          <div>
            <span className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Clock className="size-4 text-accent" /> Frequência do robô</span>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCIES.map((x) => (
                <button type="button" key={x.minutes} onClick={() => set("freq_minutes", x.minutes)} aria-pressed={f.freq_minutes === x.minutes}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${f.freq_minutes === x.minutes ? "border-accent bg-accent-soft font-medium text-accent" : "border-line text-ink-2 hover:border-ink-3"}`}>{x.label}</button>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-[13px] text-ink-3">
              ou a cada
              <input type="number" min={15} value={f.freq_minutes} onChange={(e) => set("freq_minutes", Number(e.target.value))} className="w-20 rounded-lg border border-line bg-bg px-2 py-1 text-ink outline-none focus:border-accent" />
              minutos
            </label>
          </div>
        </div>

        <EmailSettings mode={f.notify_mode} onChange={(m) => set("notify_mode", m)} searchId={initial?.id} />

        <div className="mt-6 space-y-3 rounded-2xl bg-surface-2 p-4">
          <p className="text-xs font-medium tracking-wider text-ink-3 uppercase">O que o robô vai buscar</p>
          {f.sources.includes("linkedin") && <Line label="LinkedIn" text={boolQ} />}
          {f.sources.includes("gupy") && <Line label="Gupy" text={`cada termo é buscado e o resultado filtrado por: ${boolQ}`} />}
          {(f.sources.includes("web") || !f.sources.some((x) => x === "linkedin" || x === "gupy")) && <Line label="Google" text={googleQ} />}
          <p className="text-xs text-ink-3">≈ {perMonth.toLocaleString("pt-BR")} rodadas por mês nesta frequência.</p>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{error}</p>}

        <div className="pb-safe sticky bottom-0 -mx-5 mt-7 flex items-center justify-end gap-3 border-t border-line bg-surface/95 px-5 pt-4 backdrop-blur sm:-mx-8 sm:px-8">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-medium text-ink-2 transition hover:bg-surface-2">Cancelar</button>
          <button disabled={pending || !hasTerms(f.spec)} className="rounded-full bg-accent px-7 py-3 font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50">
            {pending ? "Salvando…" : initial ? "Salvar alterações" : "Criar e rodar agora"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-[13px] leading-relaxed text-ink-2">
      <span className="mr-2 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-3">{label}</span>
      <span className="font-mono break-words">{text}</span>
    </p>
  );
}

function Segment({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <div className="inline-flex flex-wrap rounded-xl border border-line bg-bg p-1">
        {options.map((o) => (
          <button type="button" key={o.v} onClick={() => onChange(o.v)} aria-pressed={value === o.v}
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition ${value === o.v ? "bg-surface font-medium shadow-card" : "text-ink-3 hover:text-ink"}`}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

function blank(): SearchInput {
  return { name: "", spec: emptySpec(), location: "", sources: ["linkedin", "gupy"], recency: "week", freq_minutes: 360, notify_mode: "off" };
}
