"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronDown, MessageSquarePlus, Plus, Send, Download, FileText, Loader2, Pencil, Printer, RefreshCw, ShieldCheck, Sparkles, Star, Trash2, Upload, X,
} from "lucide-react";
import { acceptSuggestionAction, adaptCvAction, deleteCvAction, dismissSuggestionAction, reanalyzeResumeAction, refineSuggestionAction, saveResumeTextAction, setCvTargetAction, setPrimaryCvAction } from "@/app/actions";
import Link from "next/link";
import { useAiFlags } from "./ai-flags";
import { SUBSCORES, type Resume, type ResumeSuggestion } from "@/lib/resume-shared";
import type { FitJobItem } from "@/lib/db";
import { FitList } from "./fit-list";
import { timeAgo } from "@/lib/format";
import { Bar, ScoreRing } from "./score-ring";
import { ModuleTip } from "./guide";

type Quota = { left: number; limit: number };
export type CvLite = { id: string; name: string; target_role: string; is_primary: number; score: number; updated_at: number };
type UsedBy = { id: string; name: string; color: string }[];
const MAX_CVS = 5;

export function ResumeModule({ cvs, cv, jobs, quota, configured, autoFit, usedBy }: {
  cvs: CvLite[]; cv: Resume | null; jobs: FitJobItem[]; quota: Quota; configured: boolean; autoFit: boolean; usedBy: UsedBy;
}) {
  if (!cv) return <Empty configured={configured} />;
  return (
    <div className="mt-6 space-y-6">
      <ModuleTip id="resume" />
      <CvSwitcher cvs={cvs} current={cv.id} configured={configured} />
      <CvHeader key={cv.id} cv={cv} usedBy={usedBy} />
      <Loaded key={`l-${cv.id}`} resume={cv} jobs={jobs} quota={quota} configured={configured} autoFit={autoFit} />
    </div>
  );
}

/* ---------- envio ---------- */

function useUpload(onDone: (id: string) => void) {
  const [state, setState] = useState<{ t: "idle" } | { t: "busy"; name: string } | { t: "error"; msg: string }>({ t: "idle" });
  const send = async (file: File, fields: { cvId?: string; target?: string } = {}) => {
    setState({ t: "busy", name: file.name });
    try {
      const body = new FormData();
      body.set("file", file);
      if (fields.cvId) body.set("cvId", fields.cvId);
      if (fields.target) body.set("target", fields.target);
      const res = await fetch("/api/resume", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as { error?: string; id?: string } | null;
      if (!res.ok || json?.error || !json?.id) throw new Error(json?.error ?? "Não consegui analisar o currículo.");
      setState({ t: "idle" });
      onDone(json.id);
    } catch (e) {
      setState({ t: "error", msg: e instanceof Error ? e.message : "Não consegui analisar o currículo." });
    }
  };
  return { state, send };
}

/** Envio de arquivo. Com `cvId`, substitui aquele currículo; sem, cria um novo (com cargo-alvo opcional). */
function Dropzone({ configured, compact, cvId, askTarget }: { configured: boolean; compact?: boolean; cvId?: string; askTarget?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [target, setTarget] = useState("");
  const { state, send } = useUpload((id) => { if (id !== cvId) router.push(`/dashboard/curriculo?cv=${id}`); router.refresh(); });
  const busy = state.t === "busy";
  // a análise é feita para um cargo: sem cargo-alvo, o envio não libera
  const needTarget = !!askTarget && target.trim().length < 2;
  const go = (f: File) => { if (!needTarget) send(f, { cvId, target: target.trim() || undefined }); };

  return (
    <div>
      {askTarget && (
        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm font-medium"><span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">1</span>Para qual cargo é este currículo?</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} maxLength={120} placeholder="ex.: Head de Growth, Product Manager sênior" required
            className="w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15" />
          <span className="mt-1.5 block text-xs text-ink-3">A nota, as palavras-chave e as sugestões são para este cargo. Ele também vira o nome do currículo.</span>
        </label>
      )}
      {askTarget && <p className="mb-1.5 text-sm font-medium"><span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">2</span>Envie o arquivo</p>}
      <button type="button" disabled={busy || !configured || needTarget} onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) go(f); }}
        className={`flex w-full items-center gap-4 rounded-3xl border-2 border-dashed text-left transition disabled:cursor-not-allowed ${compact ? "p-4" : "p-5 sm:p-7"} ${drag ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/60"}`}>
        <span className={`grid shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink ${compact ? "size-11" : "size-14"}`}>
          {busy ? <Loader2 className="spin size-6" /> : <Upload className="size-6" />}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">{busy ? `Analisando ${state.name}…` : cvId ? "Enviar nova versão deste currículo" : "Envie seu currículo"}</span>
          <span className="block text-sm text-ink-3">{busy ? "A IA está lendo seção por seção. Leva uns 30 segundos." : needTarget ? "Primeiro diga o cargo-alvo, acima." : "PDF, DOCX ou TXT, até 5 MB. Toque ou arraste o arquivo aqui."}</span>
        </span>
      </button>
      <input ref={input} type="file" hidden accept=".pdf,.docx,.txt,.md,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) go(f); e.target.value = ""; }} />
      {state.t === "error" && <p role="alert" className="mt-3 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent">{state.msg}</p>}
      {!configured && <p className="mt-3 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent">A análise de currículo está desligada no momento.</p>}
    </div>
  );
}

function Empty({ configured }: { configured: boolean }) {
  const steps = [
    { i: Star, t: "Nota do currículo", d: "Uma pontuação de 0 a 100 para o cargo que você quer, com abrangência, estrutura, clareza, impacto e leitura por ATS." },
    { i: Sparkles, t: "Especialista com IA", d: "Sugestões seção por seção. Você aceita, edita, ignora ou refina cada uma com a IA." },
    { i: FileText, t: "Um currículo por objetivo", d: "Até 5 versões, cada uma com um cargo-alvo, e cada busca compara as vagas com o currículo certo." },
    { i: Pencil, t: "Vagas e carta", d: "A % de compatibilidade em cada vaga, o que falta, o currículo adaptado e a carta de apresentação." },
  ];
  return (
    <div className="mt-6 space-y-6">
      <ModuleTip id="resume" />
      <Dropzone configured={configured} askTarget />
      <p className="flex items-start gap-2 text-xs text-ink-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" /><span>Guardamos só o <strong className="font-medium text-ink-2">texto</strong> do currículo, para você aceitar sugestões e comparar com as vagas. O arquivo é descartado, e você apaga tudo quando quiser.</span></p>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ i: Icon, t, d }, n) => (
          <li key={t} className="anim-rise relative rounded-3xl border border-line bg-surface p-5 shadow-card" style={{ animationDelay: `${n * 60}ms` }}>
            <span className="absolute top-4 right-4 grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink">{n + 1}</span>
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Icon className="size-5" /></span>
            <p className="mt-4 font-semibold">{t}</p>
            <p className="mt-1 text-sm text-ink-2">{d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- vários currículos ---------- */

function CvSwitcher({ cvs, current, configured }: { cvs: CvLite[]; current: string; configured: boolean }) {
  const [adding, setAdding] = useState(false);
  const full = cvs.length >= MAX_CVS;
  return (
    <section>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Seus currículos">
        {cvs.map((c) => (
          <Link key={c.id} href={`/dashboard/curriculo?cv=${c.id}`} scroll={false} role="tab" aria-selected={c.id === current}
            className={`flex min-h-14 shrink-0 items-center gap-2.5 rounded-2xl border py-2 pr-4 pl-2 text-left transition ${c.id === current ? "border-ink bg-surface shadow-card" : "border-line bg-surface/60 hover:bg-surface"}`}>
            <ScoreRing value={c.score} size={38} />
            <span className="min-w-0">
              <span className="block max-w-[200px] truncate text-sm font-semibold">{c.target_role || <span className="text-accent">Defina o cargo-alvo</span>}</span>
              <span className="block text-xs text-ink-3">{c.is_primary ? "principal · " : ""}nota {c.score}</span>
            </span>
          </Link>
        ))}
        <button type="button" onClick={() => setAdding((v) => !v)} disabled={full} aria-expanded={adding}
          className="flex min-h-14 shrink-0 items-center gap-2 rounded-2xl border border-dashed border-line px-4 text-sm font-medium text-ink-2 transition hover:border-accent hover:text-accent disabled:opacity-50">
          <Plus className="size-4" /> {full ? `Máximo de ${MAX_CVS}` : "Novo currículo"}
        </button>
      </div>
      {adding && !full && <NewCv cvs={cvs} configured={configured} onDone={() => setAdding(false)} />}
    </section>
  );
}

function NewCv({ cvs, configured, onDone }: { cvs: CvLite[]; configured: boolean; onDone: () => void }) {
  const router = useRouter();
  const flags = useAiFlags();
  const [mode, setMode] = useState<"adapt" | "upload">(cvs.length ? "adapt" : "upload");
  const [from, setFrom] = useState(cvs.find((c) => c.is_primary)?.id ?? cvs[0]?.id ?? "");
  const [target, setTarget] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const adapt = () => start(async () => {
    setErr(null);
    const r = await adaptCvAction(from, target);
    if (!r.ok) return setErr(r.error);
    onDone();
    router.push(`/dashboard/curriculo?cv=${r.data.id}`);
  });
  return (
    <div className="anim-pop mt-3 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div role="tablist" className="inline-flex rounded-full border border-line bg-bg p-0.5 text-sm">
        {([["adapt", "Adaptar um existente"], ["upload", "Enviar outro arquivo"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} disabled={k === "adapt" && !cvs.length}
            className={`rounded-full px-3.5 py-1.5 whitespace-nowrap transition ${mode === k ? "bg-ink text-bg" : "text-ink-3 hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      {mode === "adapt" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink-2">A IA reescreve um currículo seu para outro cargo (reordena, destaca o que importa e usa o vocabulário da área), sem inventar nada, e já analisa a versão nova.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-sm font-medium">A partir de</span>
              <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-line bg-bg px-3 py-3 text-sm outline-none focus:border-accent">
                {cvs.map((c) => <option key={c.id} value={c.id}>{c.target_role || c.name}</option>)}
              </select>
            </label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Para o cargo</span>
              <input value={target} onChange={(e) => setTarget(e.target.value)} maxLength={120} placeholder="ex.: Product Manager sênior"
                onKeyDown={(e) => { if (e.key === "Enter" && target.trim().length > 1) adapt(); }}
                className="w-full rounded-xl border border-line bg-bg px-3 py-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button disabled={pending || target.trim().length < 2 || !flags.resume} onClick={adapt}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink disabled:opacity-50">
              {pending ? <><Loader2 className="spin size-4" /> Adaptando… (uns 40 s)</> : <><Sparkles className="size-4" /> Criar versão adaptada</>}
            </button>
            <button onClick={onDone} className="min-h-11 rounded-full px-4 text-sm text-ink-3 hover:text-ink">Cancelar</button>
          </div>
          {err && <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{err}</p>}
        </div>
      ) : (
        <div className="mt-4"><Dropzone configured={configured} askTarget /></div>
      )}
    </div>
  );
}

function CvHeader({ cv, usedBy }: { cv: Resume; usedBy: UsedBy }) {
  const router = useRouter();
  const flags = useAiFlags();
  const missing = !cv.target_role.trim();
  const [editing, setEditing] = useState(missing);
  const [target, setTarget] = useState(cv.target_role);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  // trocar o cargo-alvo já refaz a análise: nota e sugestões só valem para um cargo
  const save = () => start(async () => {
    setErr(null);
    const r = await setCvTargetAction(cv.id, target);
    if (!r.ok) return setErr(r.error);
    setEditing(false);
    router.refresh();
  });
  return (
    <section className={`anim-rise rounded-3xl border p-5 shadow-card sm:p-6 ${missing ? "border-accent/40 bg-accent-soft/50" : "border-line bg-surface"}`}>
      {editing ? (
        <div>
          <p className="text-sm font-medium">{missing ? "Para qual cargo é este currículo?" : "Trocar o cargo-alvo"}</p>
          <p className="mt-0.5 text-xs text-ink-3">{missing ? "A análise precisa de um cargo-alvo para valer. Ele também vira o nome do currículo." : "A nota e as sugestões são refeitas para o novo cargo."}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={target} onChange={(e) => setTarget(e.target.value)} maxLength={120} placeholder="ex.: Head de Growth" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && target.trim().length > 1) save(); }}
              className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent focus:ring-4 focus:ring-accent/15" />
            <button disabled={pending || target.trim().length < 2 || !flags.resume} onClick={save}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink disabled:opacity-50">
              {pending ? <><Loader2 className="spin size-4" /> Analisando…</> : <><Sparkles className="size-4" /> {missing ? "Analisar para este cargo" : "Salvar e reanalisar"}</>}
            </button>
            {!missing && <button onClick={() => { setEditing(false); setTarget(cv.target_role); }} className="min-h-12 rounded-full px-4 text-sm text-ink-3">Cancelar</button>}
          </div>
          {err && <p role="alert" className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{err}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-ink-3 uppercase">Cargo-alvo</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-display text-2xl leading-tight sm:text-3xl">{cv.target_role}</span>
              {cv.is_primary ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">principal</span> : null}
            </p>
            <p className="mt-2 text-xs text-ink-3">
              {usedBy.length ? <>Usado em {usedBy.length === 1 ? "1 busca" : `${usedBy.length} buscas`}: {usedBy.map((s) => s.name).join(", ")}.</> : "Nenhuma busca usa este currículo ainda."}
              {" "}Troque o currículo de uma busca na barra da própria busca.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditing(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium hover:bg-surface-2"><Pencil className="size-4" /> Trocar cargo</button>
            {!cv.is_primary && (
              <button disabled={pending} onClick={() => start(async () => { await setPrimaryCvAction(cv.id); router.refresh(); })}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium hover:bg-surface-2"><Star className="size-4" /> Tornar principal</button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- com currículo ---------- */

function Loaded({ resume, jobs, quota, configured, autoFit }: { resume: Resume; jobs: FitJobItem[]; quota: Quota; configured: boolean; autoFit: boolean }) {
  const router = useRouter();
  const a = resume.analysis;
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const open = a.suggestions.filter((s) => s.status === "open");
  const done = a.suggestions.filter((s) => s.status === "accepted").length;
  const edited = resume.updated_at > resume.analyzed_at;

  const reanalyze = () => start(async () => {
    setMsg(null);
    const r = await reanalyzeResumeAction(resume.id);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    const diff = r.data.score - r.data.before;
    setMsg({ ok: true, text: diff > 0 ? `Nova nota: ${r.data.score} (+${diff}). Mandou bem!` : `Nova nota: ${r.data.score}.` });
    router.refresh();
  });

  const download = () => {
    const blob = new Blob([resume.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = Object.assign(document.createElement("a"), { href: url, download: `${(resume.file_name || "curriculo").replace(/\.[^.]+$/, "")}-namadi.txt` });
    el.click();
    URL.revokeObjectURL(url);
  };

  const btn = "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium whitespace-nowrap transition hover:bg-surface-2 disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* pontuação */}
        <section className="anim-rise min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
          <p className="text-[11px] font-semibold tracking-wider text-accent uppercase">Pontuação do currículo</p>
          <div className="mt-4 flex items-center gap-5">
            <ScoreRing value={a.score} size={104} />
            <div className="min-w-0">
              <p className="font-display text-3xl leading-tight">{a.label}</p>
              {a.role && <p className="text-sm text-ink-3">{a.role}</p>}
              {edited && <p className="mt-1.5 inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">você editou depois desta nota</p>}
            </div>
          </div>
          {a.summary && <p className="mt-4 text-[15px] text-ink-2">{a.summary}</p>}
          <ul className="mt-5 space-y-3">
            {a.subscores.map((s) => (
              <li key={s.key}>
                <div className="mb-1 flex justify-between text-sm"><span>{SUBSCORES.find((x) => x.key === s.key)?.label}</span><span className="font-mono text-ink-3">{s.score}%</span></div>
                <Bar value={s.score} />
                {s.comment && <p className="mt-1 text-xs text-ink-3">{s.comment}</p>}
              </li>
            ))}
          </ul>
        </section>

        {/* arquivo, ações, pontos fortes */}
        <section className="anim-rise min-w-0 space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><FileText className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{resume.file_name || "Meu currículo"}</p>
                <p className="text-xs text-ink-3">analisado {timeAgo(resume.analyzed_at)}{edited ? ` · editado ${timeAgo(resume.updated_at)}` : ""}</p>
              </div>
            </div>
            <div className="scroll-thin -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <button className={`${btn} !border-ink !bg-ink !text-bg`} disabled={pending || !configured || !resume.target_role.trim()} onClick={reanalyze} title={resume.target_role.trim() ? undefined : "Defina o cargo-alvo primeiro"}>
                <RefreshCw className={`size-4 ${pending ? "spin" : ""}`} /> {pending ? "Analisando…" : "Reanalisar"}
              </button>
              <button className={btn} onClick={download}><Download className="size-4" /> .txt</button>
              <a className={btn} href={`/dashboard/curriculo/imprimir?cv=${resume.id}`} target="_blank" rel="noopener"><Printer className="size-4" /> Imprimir / PDF</a>
              {confirmDelete ? (
                <span className="anim-pop inline-flex shrink-0 items-center gap-1 rounded-full border border-accent bg-accent-soft py-1 pr-1 pl-3 text-sm whitespace-nowrap text-accent">
                  Apagar este currículo e as notas dele?
                  <button className="rounded-full bg-accent px-3 py-1 font-medium text-accent-ink" onClick={() => start(async () => { await deleteCvAction(resume.id); router.push("/dashboard/curriculo"); router.refresh(); })}>Apagar</button>
                  <button className="rounded-full px-2.5 py-1" onClick={() => setConfirmDelete(false)}>Não</button>
                </span>
              ) : (
                <button className={`${btn} text-ink-3 hover:text-accent`} onClick={() => setConfirmDelete(true)} aria-label="Apagar currículo"><Trash2 className="size-4" /></button>
              )}
            </div>
            {msg && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"}`}>{msg.text}</p>}
            {edited && !msg && <p className="mt-3 text-xs text-ink-3">Aceitou sugestões? Toque em <strong className="font-medium text-ink-2">Reanalisar</strong> para ver a nova nota.</p>}
          </div>

          {a.strengths.length > 0 && (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <p className="text-sm font-semibold">Pontos fortes</p>
              <ul className="mt-2.5 space-y-1.5 text-sm text-ink-2">{a.strengths.map((s) => <li key={s} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{s}</li>)}</ul>
              {a.keywords.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{a.keywords.map((k) => <span key={k} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">{k}</span>)}</div>}
            </div>
          )}

          {resume.target_role.trim() && <Dropzone configured={configured} compact cvId={resume.id} />}
        </section>
      </div>

      {/* especialista com IA */}
      <section className="anim-rise rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-accent uppercase">Especialista com IA</p>
            <h2 className="font-display mt-1 text-3xl">Sugestões para o seu currículo</h2>
          </div>
          {a.suggestions.length > 0 && <p className="text-sm text-ink-3">{done} de {a.suggestions.length} aplicadas</p>}
        </div>
        {a.suggestions.length > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-ok transition-all" style={{ width: `${(done / a.suggestions.length) * 100}%` }} /></div>
        )}
        <ul className="mt-5 space-y-3">
          {open.map((s, i) => <SuggestionCard key={s.id} cvId={resume.id} s={s} i={i} />)}
          {open.length === 0 && (
            <li className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-3">
              Nenhuma sugestão pendente. {edited ? "Reanalise para ver a nova nota e receber novas sugestões." : "Seu currículo está em dia com esta análise."}
            </li>
          )}
        </ul>
        {a.suggestions.some((s) => s.status !== "open") && (
          <details className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-ink-3 [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 transition group-open:rotate-180" /> Ver aplicadas e ignoradas
            </summary>
            <ul className="mt-3 space-y-2">
              {a.suggestions.filter((s) => s.status !== "open").map((s) => (
                <li key={s.id} className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-3 py-2 text-sm">
                  {s.status === "accepted" ? <Check className="mt-0.5 size-4 shrink-0 text-ok" /> : <X className="mt-0.5 size-4 shrink-0 text-ink-3" />}
                  <span className="min-w-0"><span className="font-medium">{s.section}:</span> <span className="text-ink-2">{s.issue}</span></span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <ResumeText key={resume.id} cvId={resume.id} text={resume.text} />

      <FitList jobs={jobs} resumeAt={resume.updated_at} quota={quota} autoFit={autoFit} />
    </div>
  );
}

function SuggestionCard({ cvId, s: initial, i }: { cvId: string; s: ResumeSuggestion; i: number }) {
  const flags = useAiFlags();
  const [refined, setRefined] = useState<ResumeSuggestion | null>(null);
  const s = refined && refined.id === initial.id && (refined.thread?.length ?? 0) >= (initial.thread?.length ?? 0) ? refined : initial;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.suggestion);
  const [chat, setChat] = useState((initial.thread?.length ?? 0) > 0);
  const [note, setNote] = useState("");
  const [thinking, setThinking] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const act = (fn: () => Promise<void>) => start(async () => { setErr(null); try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Não deu certo."); } });
  const tone = s.priority === "alta" ? "bg-accent text-accent-ink" : s.priority === "média" ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-2";
  const thread = s.thread ?? [];

  const refine = () => {
    const text = note.trim();
    if (!text || thinking) return;
    setErr(null); setThinking(true);
    start(async () => {
      const r = await refineSuggestionAction(cvId, s.id, text);
      setThinking(false);
      if (!r.ok) return setErr(r.error);
      setRefined(r.data); setDraft(r.data.suggestion); setNote(""); setEditing(false);
    });
  };

  return (
    <li className="anim-rise flex gap-3" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
      <span className="mt-1 hidden size-8 shrink-0 place-items-center rounded-full bg-ink text-bg sm:grid"><Sparkles className="size-4" /></span>
      <div className="min-w-0 flex-1 rounded-2xl border border-line bg-bg/60 p-4 sm:rounded-tl-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${tone}`}>{s.priority}</span>
          <span className="text-xs font-medium text-ink-3">{s.section}</span>
          {thread.length > 0 && <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-semibold text-ok">refinada com você</span>}
        </div>
        <p className="mt-1.5 font-medium">{s.issue}</p>
        {s.original && <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-3 line-through decoration-accent/50">{s.original}</p>}
        {editing ? (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.min(8, Math.max(3, Math.ceil(draft.length / 70)))}
            className="mt-2 w-full rounded-xl border border-accent bg-surface px-3 py-2 text-sm outline-none ring-4 ring-accent/15" />
        ) : (
          <p key={s.suggestion} className={`mt-2 rounded-xl bg-ok-soft px-3 py-2 text-sm whitespace-pre-line text-ink ${refined ? "anim-pop" : ""}`}>{!s.original && <span className="mr-1 text-xs font-semibold text-ok">+ acrescentar:</span>}{s.suggestion}</p>
        )}
        {s.why && <p className="mt-2 text-xs text-ink-3">{s.why}</p>}

        {/* refinar com a IA: a pessoa acrescenta um ponto e a IA responde considerando o item inteiro */}
        {chat && (
          <div className="mt-3 space-y-2 rounded-2xl border border-line bg-surface p-3">
            {thread.map((m, k) => (
              <p key={k} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <span className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${m.role === "user" ? "rounded-br-md bg-ink text-bg" : "rounded-bl-md bg-surface-2 text-ink"}`}>{m.text}</span>
              </p>
            ))}
            {thinking && <p className="flex"><span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface-2 px-3 py-2 text-sm text-ink-3"><Loader2 className="spin size-4" /> Refinando…</span></p>}
            {thread.length === 0 && !thinking && (
              <div className="flex flex-wrap gap-1.5">
                {["Tenho o número: ", "Na verdade, eu ", "Quero destacar ", "Prefiro um tom mais "].map((ex) => (
                  <button key={ex} type="button" onClick={() => setNote(ex)} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-accent hover:text-accent">{ex.trim()}…</button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} disabled={thinking}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); refine(); } }}
                placeholder="Conte o que a IA precisa saber: um resultado, uma correção, um contexto…" aria-label="Seu ponto para a IA"
                className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15" />
              <button type="button" onClick={refine} disabled={thinking || note.trim().length < 3} aria-label="Enviar para a IA"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40"><Send className="size-4" /></button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={pending || !draft.trim()} onClick={() => act(() => acceptSuggestionAction(cvId, s.id, editing ? draft : undefined))}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bg transition hover:opacity-85 disabled:opacity-50">
            <Check className="size-4" /> {editing ? "Aplicar minha versão" : "Aceitar"}
          </button>
          {flags.refine && !editing && (
            <button disabled={thinking} onClick={() => setChat((v) => !v)} aria-expanded={chat}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition ${chat ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-surface-2"}`}>
              <MessageSquarePlus className="size-4" /> Refinar com a IA
            </button>
          )}
          <button disabled={pending} onClick={() => { setDraft(s.suggestion); setEditing((v) => !v); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium transition hover:bg-surface-2">
            <Pencil className="size-4" /> {editing ? "Cancelar" : "Editar"}
          </button>
          {!editing && <button disabled={pending} onClick={() => act(() => dismissSuggestionAction(cvId, s.id))} className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-ink-3 transition hover:text-ink">Ignorar</button>}
        </div>
        {err && <p role="alert" className="mt-2 text-sm text-accent">{err}</p>}
      </div>
    </li>
  );
}

function ResumeText({ cvId, text }: { cvId: string; text: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <details className="group anim-rise rounded-3xl border border-line bg-surface shadow-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-4 sm:px-7 [&::-webkit-details-marker]:hidden">
        <FileText className="size-5 text-accent" />
        <span className="flex-1 font-semibold">Seu currículo, versão atual</span>
        <ChevronDown className="size-5 text-ink-3 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-5 pt-4 pb-5 sm:px-7">
        {editing ? (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={18} className="w-full rounded-xl border border-line bg-bg p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-accent focus:ring-4 focus:ring-accent/15" />
        ) : (
          <pre className="max-h-[480px] overflow-auto rounded-xl bg-bg p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink-2">{text}</pre>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {editing ? (
            <>
              <button disabled={pending} onClick={() => start(async () => { setErr(null); try { await saveResumeTextAction(cvId, draft); setEditing(false); } catch (e) { setErr(e instanceof Error ? e.message : "Não salvou."); } })}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bg">{pending ? "Salvando…" : "Salvar"}</button>
              <button onClick={() => { setDraft(text); setEditing(false); }} className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-medium">Cancelar</button>
            </>
          ) : (
            <button onClick={() => { setDraft(text); setEditing(true); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium transition hover:bg-surface-2"><Pencil className="size-4" /> Editar texto</button>
          )}
        </div>
        {err && <p role="alert" className="mt-2 text-sm text-accent">{err}</p>}
      </div>
    </details>
  );
}
