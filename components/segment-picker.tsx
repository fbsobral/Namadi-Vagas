"use client";

import { useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { INDUSTRIES, MODELS, SIZES, hasSegments, type Segments } from "@/lib/segments";
import { useAiFlags } from "./ai-flags";

/** Segmentar as empresas da busca: modelo de negócio, porte e setor. Vazio = todas. */
export function SegmentPicker({ value, onChange }: { value: Segments | undefined; onChange: (s: Segments | undefined) => void }) {
  const flags = useAiFlags();
  const active = hasSegments(value);
  const [open, setOpen] = useState(active);
  const v = value ?? {};
  const toggle = <K extends keyof Segments>(k: K, key: NonNullable<Segments[K]>[number]) => {
    const cur = (v[k] ?? []) as string[];
    const next = { ...v, [k]: cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key] };
    onChange(hasSegments(next) ? next : undefined);
  };
  const n = (v.models?.length ?? 0) + (v.sizes?.length ?? 0) + (v.industries?.length ?? 0);
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:border-ink-3"}`;

  if (!flags.company && !active) return null; // recurso desligado no /admin

  return (
    <div className="mt-6 rounded-2xl border border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left">
        <Building2 className="size-4 shrink-0 text-accent" />
        <span className="flex-1 text-sm font-medium">Segmentar empresas <span className="font-normal text-ink-3">(opcional)</span></span>
        {n > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-ink">{n}</span>}
        <ChevronDown className={`size-4 text-ink-3 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-line px-4 pt-3 pb-4">
          <p className="text-xs text-ink-3">A IA classifica cada empresa uma vez (rápido e barato). Vagas de empresas fora do segmento vão para a aba Filtradas, com o motivo; empresas que a IA não conhece continuam na lista.{!flags.company && " A classificação está desligada no momento: os filtros valem só para empresas já classificadas."}</p>
          <div>
            <p className="mb-2 text-sm font-medium">Modelo de negócio</p>
            <div className="flex flex-wrap gap-1.5">{MODELS.map((m) => <button key={m.key} type="button" title={m.hint} aria-pressed={!!v.models?.includes(m.key)} onClick={() => toggle("models", m.key)} className={chip(!!v.models?.includes(m.key))}>{m.label}</button>)}</div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Porte</p>
            <div className="flex flex-wrap gap-1.5">{SIZES.map((m) => <button key={m.key} type="button" aria-pressed={!!v.sizes?.includes(m.key)} onClick={() => toggle("sizes", m.key)} className={chip(!!v.sizes?.includes(m.key))}>{m.label} <span className="opacity-60">· {m.hint}</span></button>)}</div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Setores</p>
            <div className="flex flex-wrap gap-1.5">{INDUSTRIES.map((m) => <button key={m.key} type="button" aria-pressed={!!v.industries?.includes(m.key)} onClick={() => toggle("industries", m.key)} className={chip(!!v.industries?.includes(m.key))}>{m.label}</button>)}</div>
          </div>
          {n > 0 && <button type="button" onClick={() => onChange(undefined)} className="text-sm text-ink-3 underline underline-offset-4 hover:text-ink">Limpar segmentos</button>}
        </div>
      )}
    </div>
  );
}
