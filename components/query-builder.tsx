"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Group, Op, QuerySpec } from "@/lib/query";

const EXAMPLES = ["Product Designer", "UX Designer", "Design Lead", "Engenheiro de dados", "Head de Marketing"];

export function QueryBuilder({ spec, onChange }: { spec: QuerySpec; onChange: (s: QuerySpec) => void }) {
  const setGroup = (i: number, g: Group) => onChange({ ...spec, groups: spec.groups.map((x, k) => (k === i ? g : x)) });
  const removeGroup = (i: number) => onChange({ ...spec, groups: spec.groups.filter((_, k) => k !== i) });
  const addGroup = () => onChange({ ...spec, groups: [...spec.groups, { op: "OR", terms: [] }] });
  const empty = spec.groups.every((g) => g.terms.length === 0);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Palavras-chave</span>
        <span className="hidden text-xs text-ink-3 sm:inline">Enter adiciona · termo com espaço vira frase exata</span>
      </div>

      <div className="space-y-2">
        {spec.groups.map((g, i) => (
          <div key={i}>
            {i > 0 && (
              <div className="my-2 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <OpToggle value={spec.between} onChange={(between) => onChange({ ...spec, between })} labels={["E", "OU"]} title="Como combinar os grupos" />
                <span className="h-px flex-1 bg-line" />
              </div>
            )}
            <GroupCard index={i} isLast={i === spec.groups.length - 1} group={g} canRemove={spec.groups.length > 1} onChange={(ng) => setGroup(i, ng)} onRemove={() => removeGroup(i)} />
          </div>
        ))}
      </div>

      {empty && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {EXAMPLES.map((x) => (
            <button type="button" key={x} onClick={() => setGroup(0, { ...spec.groups[0], terms: [x] })} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-2 transition hover:border-accent hover:text-accent">{x}</button>
          ))}
        </div>
      )}

      {spec.groups.length < 6 && (
        <button type="button" onClick={addGroup} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-sm text-ink-2 transition hover:border-accent hover:text-accent">
          <Plus className="size-4" /> Adicionar grupo
        </button>
      )}

      <div className="mt-5">
        <span className="mb-1.5 block text-sm font-medium">Não pode conter <span className="font-normal text-ink-3">(opcional)</span></span>
        <ChipInput terms={spec.exclude} onChange={(exclude) => onChange({ ...spec, exclude })} placeholder="ex.: estágio, jovem aprendiz" tone="neg" />
      </div>
    </div>
  );
}

function GroupCard({ index, isLast, group, canRemove, onChange, onRemove }: { index: number; isLast: boolean; group: Group; canRemove: boolean; onChange: (g: Group) => void; onRemove: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-bg p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wider text-ink-3 uppercase">Grupo {index + 1}</span>
        <div className="flex items-center gap-2">
          {group.terms.length > 1 && (
            <span className="flex items-center gap-2 text-xs text-ink-3">
              entre os termos:
              <OpToggle value={group.op} onChange={(op) => onChange({ ...group, op })} labels={["E", "OU"]} title="Como combinar os termos do grupo" />
            </span>
          )}
          {canRemove && <button type="button" onClick={onRemove} aria-label="Remover grupo" className="grid size-7 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-accent"><X className="size-4" /></button>}
        </div>
      </div>
      <ChipInput terms={group.terms} onChange={(terms) => onChange({ ...group, terms })} placeholder={group.terms.length ? "adicionar outro termo…" : 'ex.: Product Designer'} autoFocus={isLast && index > 0} />
    </div>
  );
}

function ChipInput({ terms, onChange, placeholder, tone, autoFocus }: { terms: string[]; onChange: (t: string[]) => void; placeholder: string; tone?: "neg"; autoFocus?: boolean }) {
  const [draft, setDraft] = useState("");
  const commit = (raw = draft) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...terms, ...parts.filter((p) => !terms.includes(p))]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-2 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
      {terms.map((t) => (
        <span key={t} className={`inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm ${tone === "neg" ? "bg-ink/90 text-bg" : "bg-accent-soft text-accent"}`}>
          {tone === "neg" && <span aria-hidden>−</span>}{t}
          <button type="button" onClick={() => onChange(terms.filter((x) => x !== t))} aria-label={`Remover ${t}`} className="grid size-5 place-items-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100"><X className="size-3.5" /></button>
        </span>
      ))}
      <input
        autoFocus={autoFocus}
        value={draft}
        onChange={(e) => (e.target.value.includes(",") ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Backspace" && !draft && terms.length) onChange(terms.slice(0, -1));
        }}
        onBlur={() => draft.trim() && commit()}
        placeholder={placeholder}
        className="min-w-[140px] flex-1 bg-transparent px-1.5 py-1 text-[15px] outline-none placeholder:text-ink-3"
      />
    </div>
  );
}

function OpToggle({ value, onChange, labels, title }: { value: Op; onChange: (o: Op) => void; labels: [string, string]; title: string }) {
  return (
    <span role="group" aria-label={title} title={title} className="inline-flex rounded-full border border-line bg-surface p-0.5 text-xs font-semibold">
      {(["AND", "OR"] as const).map((o, i) => (
        <button type="button" key={o} aria-pressed={value === o} onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1 transition ${value === o ? "bg-ink text-bg" : "text-ink-3 hover:text-ink"}`}>{labels[i]}</button>
      ))}
    </span>
  );
}
