"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureDescription } from "@/app/actions";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Descrição da vaga com as palavras da busca destacadas. No LinkedIn, lê a descrição na 1ª vez que a vaga é aberta. */
export function JobDescription({ jobId, source, description, snippet, terms }: { jobId: string; source: string; description: string | null; snippet: string; terms: string[] }) {
  const [text, setText] = useState<string | null>(description);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (text !== null || source !== "linkedin") return;
    let alive = true;
    ensureDescription(jobId)
      .then((t) => alive && setText(t))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Não consegui ler a descrição."));
    return () => { alive = false; };
  }, [jobId, source, text]);

  const body = text && text.trim() ? text : snippet;
  const re = useMemo(() => {
    const t = terms.filter((x) => x.length > 1).sort((a, b) => b.length - a.length).map(esc);
    return t.length ? new RegExp(`(${t.join("|")})`, "gi") : null;
  }, [terms]);
  const parts = body && re ? body.split(re) : [body];
  const hits = body && re ? new Set((body.match(re) ?? []).map((m) => m.toLowerCase())) : new Set<string>();

  if (text === null && source === "linkedin" && !error) {
    return (
      <div aria-busy="true" className="mt-5 space-y-2.5 rounded-2xl border border-line bg-surface p-4">
        <p className="text-xs text-ink-3">Lendo a descrição da vaga…</p>
        {[92, 100, 78, 96, 60].map((w, i) => <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />)}
      </div>
    );
  }
  if (!body) return error ? <p className="mt-5 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{error}</p> : null;

  return (
    <div className="mt-5">
      {hits.size > 0 && (
        <p className="mb-2 text-xs text-ink-3">Palavras da sua busca nesta vaga: {[...hits].map((h) => <mark key={h} className="mr-1 rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent">{h}</mark>)}</p>
      )}
      <div className="scroll-thin max-h-[46dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed whitespace-pre-line text-ink-2">
        {parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="rounded bg-accent-soft px-0.5 font-medium text-accent">{p}</mark> : <span key={i}>{p}</span>))}
      </div>
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
    </div>
  );
}
