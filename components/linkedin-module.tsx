"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ClipboardList, Copy, Loader2, MessageSquarePlus, RefreshCw, Send, ShieldCheck, Sparkles, Trash2, Undo2, Upload } from "lucide-react";
import { deleteLinkedinAction, markLinkedinSuggestionAction, reanalyzeLinkedinAction, refineLinkedinAction } from "@/app/actions";
import { LI_LIMITS, LI_SUBSCORES, type LinkedinProfile } from "@/lib/linkedin-shared";
import type { ResumeSuggestion } from "@/lib/resume-shared";
import { timeAgo } from "@/lib/format";
import { Bar, ScoreRing } from "./score-ring";
import { ModuleTip } from "./guide";
import { useAiFlags } from "./ai-flags";
import { useJobs } from "./background-jobs";

export function LinkedinModule({ profile, targets, configured }: { profile: LinkedinProfile | null; targets: string[]; configured: boolean }) {
  return profile ? <Loaded p={profile} targets={targets} configured={configured} /> : <Empty targets={targets} configured={configured} />;
}

function Copier({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); }}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium transition hover:bg-surface-2">
      {ok ? <><Check className="size-3.5 text-ok" /> Copiado</> : <><Copy className="size-3.5" /> {label}</>}
    </button>
  );
}

const Count = ({ n, max }: { n: number; max: number }) => <span className={`font-mono text-[11px] ${n > max ? "text-accent" : "text-ink-3"}`}>{n}/{max}</span>;

/** Objetivo: cargo-alvo livre, com sugestões dos cargos dos currículos. */
function TargetInput({ value, onChange, targets, step }: { value: string; onChange: (v: string) => void; targets: string[]; step?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{step && <span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-[#0a66c2] text-[11px] font-bold text-white">1</span>}Para qual cargo você quer ser encontrado?</span>
      <input list="li-targets" value={value} onChange={(e) => onChange(e.target.value)} maxLength={120} placeholder="ex.: Head de Growth"
        className="w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15" />
      <datalist id="li-targets">{targets.map((t) => <option key={t} value={t} />)}</datalist>
      {targets.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {targets.map((t) => <button key={t} type="button" onClick={() => onChange(t)} className={`rounded-full border px-2.5 py-1 text-xs transition ${value === t ? "border-ink bg-ink text-bg" : "border-line text-ink-2 hover:border-ink-3"}`}>{t}</button>)}
        </span>
      )}
    </label>
  );
}

function Uploader({ targets, configured, initialTarget = "", compact }: { targets: string[]; configured: boolean; initialTarget?: string; compact?: boolean }) {
  const jobs = useJobs();
  const working = !!jobs?.busy("linkedin");
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState(initialTarget);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // a análise é sempre para um cargo: sem cargo-alvo, o envio não libera
  const needTarget = target.trim().length < 2;
  const send = async (fields: { file?: File; text?: string }) => {
    if (needTarget) return setErr("Diga primeiro para qual cargo você quer ser encontrado.");
    setErr(null); setBusy(fields.file?.name ?? "o texto");
    try {
      const body = new FormData();
      if (fields.file) body.set("file", fields.file);
      if (fields.text) body.set("text", fields.text);
      if (target.trim()) body.set("target", target.trim());
      const res = await fetch("/api/linkedin", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as { error?: string; jobId?: string } | null;
      if (!res.ok || json?.error || !json?.jobId) throw new Error(json?.error ?? "Não consegui analisar o perfil.");
      setPaste(""); setShowPaste(false);
      jobs?.track(json.jobId); // segue em segundo plano: pode trocar de tela
    } catch (e) { setErr(e instanceof Error ? e.message : "Não consegui analisar o perfil."); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-4">
      {!compact && <TargetInput value={target} onChange={setTarget} targets={targets} step />}
      {!compact && <p className="text-sm font-medium"><span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-[#0a66c2] text-[11px] font-bold text-white">2</span>Envie o perfil</p>}
      <button type="button" disabled={!!busy || working || !configured || needTarget} onClick={() => input.current?.click()}
        className={`flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-line bg-surface text-left transition hover:border-accent/60 disabled:cursor-not-allowed ${compact ? "p-4" : "p-5 sm:p-7"}`}>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#0a66c2] text-white">{busy || working ? <Loader2 className="spin size-6" /> : <Upload className="size-6" />}</span>
        <span className="min-w-0">
          <span className="block font-semibold">{busy ? `Enviando ${busy}…` : working ? "Analisando em segundo plano…" : compact ? "Enviar o perfil de novo" : "Envie o PDF do seu perfil"}</span>
          <span className="block text-sm text-ink-3">{busy || working ? "Leva uns 30 segundos. Pode trocar de tela: avisamos quando terminar." : needTarget ? "Primeiro diga o cargo, acima." : "No LinkedIn, abra seu perfil › Mais › Salvar como PDF. Depois toque aqui."}</span>
        </span>
      </button>
      <input ref={input} type="file" hidden accept=".pdf,.docx,.txt,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) send({ file: f }); e.target.value = ""; }} />
      <div>
        <button type="button" onClick={() => setShowPaste((v) => !v)} className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"><ClipboardList className="size-4" /> {showPaste ? "Fechar" : "Prefiro colar o texto do perfil"}</button>
        {showPaste && (
          <div className="mt-2 space-y-2">
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} placeholder="Cole aqui o título, o Sobre, as experiências e as competências do seu perfil."
              className="w-full rounded-xl border border-line bg-bg p-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15" />
            <button type="button" disabled={!!busy || paste.trim().length < 80 || !configured || needTarget} onClick={() => send({ text: paste })}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-bg disabled:opacity-50"><Sparkles className="size-4" /> Analisar o texto</button>
          </div>
        )}
      </div>
      {err && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent">{err}</p>}
      {!configured && <p className="rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent">A análise de perfil está desligada no momento.</p>}
    </div>
  );
}

function Empty({ targets, configured }: { targets: string[]; configured: boolean }) {
  return (
    <div className="mt-6 space-y-6">
      <ModuleTip id="linkedin" />
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
        <Uploader targets={targets} configured={configured} />
        <p className="mt-4 flex items-start gap-2 text-xs text-ink-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" /> O robô não entra no seu LinkedIn: você manda o PDF que o próprio LinkedIn gera. Guardamos só o texto; o arquivo é descartado.</p>
      </section>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["Nota do perfil", "Título, Sobre, experiências, competências e o quanto você aparece nas buscas."], ["3 títulos prontos", "Opções de título com as palavras que recrutadores buscam, dentro do limite de 220 caracteres."], ["Sobre reescrito", "Com gancho na primeira linha e seus resultados reais, pronto para colar."], ["Sugestões e checklist", "Melhorias por seção, com Refinar com a IA, e o que conferir no perfil."]].map(([t, d], n) => (
          <li key={t} className="anim-rise relative rounded-3xl border border-line bg-surface p-5 shadow-card" style={{ animationDelay: `${n * 60}ms` }}>
            <span className="absolute top-4 right-4 grid size-7 place-items-center rounded-full bg-[#0a66c2] text-xs font-bold text-white">{n + 1}</span>
            <p className="mt-6 font-semibold">{t}</p>
            <p className="mt-1 text-sm text-ink-2">{d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Loaded({ p, targets, configured }: { p: LinkedinProfile; targets: string[]; configured: boolean }) {
  const router = useRouter();
  const jobs = useJobs();
  const analyzing = !!jobs?.busy("linkedin");
  const a = p.analysis;
  const [target, setTarget] = useState(p.target_role);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const open = a.suggestions.filter((s) => s.status === "open");
  const done = a.suggestions.filter((s) => s.status === "accepted");

  const reanalyze = () => start(async () => {
    setMsg(null);
    const r = await reanalyzeLinkedinAction(target);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    jobs?.track(r.data.jobId); // a nova nota chega pelo aviso, mesmo se você trocar de tela
  });

  return (
    <div className="mt-6 space-y-6">
      <ModuleTip id="linkedin" />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section className="anim-rise min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
          <p className="text-[11px] font-semibold tracking-wider text-[#0a66c2] uppercase">Nota do perfil</p>
          <div className="mt-4 flex items-center gap-5">
            <ScoreRing value={a.score} size={104} />
            <div className="min-w-0"><p className="font-display text-3xl leading-tight">{a.label}</p><p className="text-sm text-ink-3">{p.target_role ? `para ${p.target_role}` : "análise geral"}</p></div>
          </div>
          {a.summary && <p className="mt-4 text-[15px] text-ink-2">{a.summary}</p>}
          <ul className="mt-5 space-y-3">
            {a.subscores.map((s) => (
              <li key={s.key}>
                <div className="mb-1 flex justify-between text-sm"><span>{LI_SUBSCORES.find((x) => x.key === s.key)?.label}</span><span className="font-mono text-ink-3">{s.score}%</span></div>
                <Bar value={s.score} />
                {s.comment && <p className="mt-1 text-xs text-ink-3">{s.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
        <section className="anim-rise min-w-0 space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <TargetInput value={target} onChange={setTarget} targets={targets} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={pending || analyzing || !configured || target.trim().length < 2} onClick={reanalyze} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-bg disabled:opacity-50">
                <RefreshCw className={`size-4 ${pending || analyzing ? "spin" : ""}`} /> {pending || analyzing ? "Analisando…" : target.trim() !== p.target_role ? "Analisar para este cargo" : "Reanalisar"}
              </button>
              {confirm ? (
                <span className="anim-pop inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pr-1 pl-3 text-sm text-accent">
                  Apagar o perfil e a análise?
                  <button className="rounded-full bg-accent px-3 py-1 font-medium text-accent-ink" onClick={() => start(async () => { await deleteLinkedinAction(); router.refresh(); })}>Apagar</button>
                  <button className="rounded-full px-2.5 py-1" onClick={() => setConfirm(false)}>Não</button>
                </span>
              ) : <button onClick={() => setConfirm(true)} aria-label="Apagar perfil" className="grid min-h-10 w-10 place-items-center rounded-full border border-line text-ink-3 hover:text-accent"><Trash2 className="size-4" /></button>}
            </div>
            <p className="mt-3 text-xs text-ink-3">Analisado {timeAgo(p.analyzed_at)} · {p.file_name}</p>
            {msg && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"}`}>{msg.text}</p>}
          </div>
          <Uploader targets={targets} configured={configured} initialTarget={p.target_role} compact />
        </section>
      </div>

      {/* título */}
      {a.headlines.length > 0 && (
        <section className="anim-rise rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
          <p className="text-[11px] font-semibold tracking-wider text-[#0a66c2] uppercase">Título</p>
          <h2 className="font-display mt-1 text-3xl">3 opções de título</h2>
          <p className="mt-1 text-sm text-ink-3">É o que aparece embaixo do seu nome e nas buscas. Escolha uma, ajuste e cole no LinkedIn.</p>
          <ul className="mt-4 space-y-2">
            {a.headlines.map((h, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-bg/60 p-3.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0a66c2]/10 text-xs font-bold text-[#0a66c2]">{i + 1}</span>
                <p className="min-w-0 flex-1 text-sm font-medium">{h}</p>
                <Count n={h.length} max={LI_LIMITS.headline} />
                <Copier text={h} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* sobre */}
      {a.about && (
        <section className="anim-rise rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-[11px] font-semibold tracking-wider text-[#0a66c2] uppercase">Sobre</p><h2 className="font-display mt-1 text-3xl">Seu “Sobre” reescrito</h2></div>
            <div className="flex items-center gap-2"><Count n={a.about.length} max={LI_LIMITS.about} /><Copier text={a.about} /></div>
          </div>
          <p className="mt-4 rounded-2xl bg-bg/60 p-4 text-sm leading-relaxed whitespace-pre-line text-ink-2"><strong className="font-semibold text-ink">{a.about.split("\n")[0]}</strong>{a.about.includes("\n") ? `\n${a.about.split("\n").slice(1).join("\n")}` : ""}</p>
          <p className="mt-2 text-xs text-ink-3">A primeira linha (em negrito) é o que aparece antes do “ver mais”.</p>
        </section>
      )}

      {/* palavras-chave e competências */}
      <section className="anim-rise grid gap-4 md:grid-cols-2">
        <div className="min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <p className="font-semibold">Palavras-chave</p>
          <p className="mt-1 text-xs text-ink-3">O que recrutadores digitam para achar perfis como o seu.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.keywords_have.map((k) => <span key={k} className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-medium text-ok">✓ {k}</span>)}
            {a.keywords_missing.map((k) => <span key={k} className="rounded-full border border-accent/40 bg-accent-soft/60 px-2.5 py-1 text-xs font-medium text-accent">+ {k}</span>)}
          </div>
          {a.keywords_missing.length > 0 && <p className="mt-2 text-xs text-ink-3">As com + faltam: use no título, no Sobre ou nas experiências onde for verdade.</p>}
        </div>
        <div className="min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <p className="font-semibold">Competências em destaque</p>
          <p className="mt-1 text-xs text-ink-3">Fixe estas no topo da seção Competências, nesta ordem.</p>
          <ol className="mt-3 space-y-1.5">{a.skills.map((s, i) => <li key={s} className="flex items-center gap-2.5 text-sm"><span className="grid size-6 place-items-center rounded-full bg-surface-2 text-xs font-semibold">{i + 1}</span>{s}</li>)}</ol>
        </div>
      </section>

      {/* sugestões */}
      <section className="anim-rise rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-semibold tracking-wider text-[#0a66c2] uppercase">Por seção</p><h2 className="font-display mt-1 text-3xl">Sugestões para o perfil</h2></div>
          {a.suggestions.length > 0 && <p className="text-sm text-ink-3">{done.length} de {a.suggestions.length} feitas</p>}
        </div>
        <ul className="mt-5 space-y-3">
          {open.map((s) => <LiSuggestion key={s.id} s={s} />)}
          {open.length === 0 && <li className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-3">Tudo feito por aqui. Reanalise depois de atualizar o perfil.</li>}
        </ul>
        {done.length > 0 && (
          <details className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-ink-3 [&::-webkit-details-marker]:hidden"><ChevronDown className="size-4 transition group-open:rotate-180" /> Ver as feitas</summary>
            <ul className="mt-3 space-y-2">{done.map((s) => (
              <li key={s.id} className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-3 py-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-ok" />
                <span className="min-w-0 flex-1"><span className="font-medium">{s.section}:</span> <span className="text-ink-2">{s.issue}</span></span>
                <button onClick={() => start(async () => { await markLinkedinSuggestionAction(s.id, false); })} aria-label="Desfazer" className="text-ink-3 hover:text-ink"><Undo2 className="size-4" /></button>
              </li>
            ))}</ul>
          </details>
        )}
      </section>

      {/* checklist */}
      {a.checklist.length > 0 && (
        <section className="anim-rise rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
          <p className="font-semibold">Confira no LinkedIn</p>
          <p className="mt-1 text-xs text-ink-3">Coisas que o PDF não mostra, mas fazem diferença.</p>
          <ul className="mt-3 space-y-2">
            {a.checklist.map((c, i) => (
              <li key={c}>
                <label className="flex min-h-10 cursor-pointer items-start gap-3 rounded-xl px-1 py-1.5 text-sm">
                  <input type="checkbox" checked={checked.has(i)} onChange={() => setChecked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} className="mt-0.5 size-4 accent-[var(--accent)]" />
                  <span className={checked.has(i) ? "text-ink-3 line-through" : ""}>{c}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LiSuggestion({ s: initial }: { s: ResumeSuggestion }) {
  const flags = useAiFlags();
  const [refined, setRefined] = useState<ResumeSuggestion | null>(null);
  const s = refined ?? initial;
  const [chat, setChat] = useState((initial.thread?.length ?? 0) > 0);
  const [note, setNote] = useState("");
  const [thinking, setThinking] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const thread = s.thread ?? [];
  const tone = s.priority === "alta" ? "bg-accent text-accent-ink" : s.priority === "média" ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-2";
  const refine = () => {
    const text = note.trim();
    if (!text || thinking) return;
    setErr(null); setThinking(true);
    start(async () => {
      const r = await refineLinkedinAction(s.id, text);
      setThinking(false);
      if (!r.ok) return setErr(r.error);
      setRefined(r.data); setNote("");
    });
  };
  return (
    <li className="rounded-2xl border border-line bg-bg/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${tone}`}>{s.priority}</span>
        <span className="text-xs font-medium text-ink-3">{s.section}</span>
        {thread.length > 0 && <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-semibold text-ok">refinada com você</span>}
      </div>
      <p className="mt-1.5 font-medium">{s.issue}</p>
      {s.original && <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-3 line-through decoration-accent/50">{s.original}</p>}
      <p key={s.suggestion} className={`mt-2 rounded-xl bg-ok-soft px-3 py-2 text-sm whitespace-pre-line ${refined ? "anim-pop" : ""}`}>{s.suggestion}</p>
      {s.why && <p className="mt-2 text-xs text-ink-3">{s.why}</p>}
      {chat && (
        <div className="mt-3 space-y-2 rounded-2xl border border-line bg-surface p-3">
          {thread.map((m, k) => (
            <p key={k} className={`flex ${m.role === "user" ? "justify-end" : ""}`}><span className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${m.role === "user" ? "rounded-br-md bg-ink text-bg" : "rounded-bl-md bg-surface-2"}`}>{m.text}</span></p>
          ))}
          {thinking && <p><span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface-2 px-3 py-2 text-sm text-ink-3"><Loader2 className="spin size-4" /> Refinando…</span></p>}
          <div className="flex items-end gap-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} disabled={thinking}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); refine(); } }}
              placeholder="Conte o que a IA precisa saber: um resultado, uma correção, um contexto…" aria-label="Seu ponto para a IA"
              className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15" />
            <button type="button" onClick={refine} disabled={thinking || note.trim().length < 3} aria-label="Enviar para a IA" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40"><Send className="size-4" /></button>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Copier text={s.suggestion} />
        <button disabled={pending} onClick={() => start(async () => { await markLinkedinSuggestionAction(s.id, true); })}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-xs font-medium text-bg disabled:opacity-50"><Check className="size-3.5" /> Já fiz no LinkedIn</button>
        {flags.refine && (
          <button onClick={() => setChat((v) => !v)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium ${chat ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-surface-2"}`}>
            <MessageSquarePlus className="size-3.5" /> Refinar com a IA
          </button>
        )}
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-accent">{err}</p>}
    </li>
  );
}
