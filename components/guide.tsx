"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightLeft, BookOpen, Building2, FileText, Bot, Check, ChevronLeft, ChevronRight, CircleCheck, CircleHelp, Clock, Columns3, Copy, Eye, Funnel,
  LayoutList, Lightbulb, LogOut, Mail, Radar, RotateCcw, Search, Share2, Smartphone, Sparkles, Star, Users, X,
} from "lucide-react";
import { GuideVisual } from "./guide-visuals";
import { GUIDES, MODULE_GUIDES, guideState, type GuideId, type IconKey } from "@/lib/onboarding";

export const ICONS: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  radar: Radar, search: Search, bot: Bot, star: Star, users: Users, kanban: Columns3, mail: Mail, share: Share2, sparkles: Sparkles,
  filter: Funnel, list: LayoutList, phone: Smartphone, clock: Clock, eye: Eye, copy: Copy, move: ArrowRightLeft, help: CircleHelp,
  check: Check, logout: LogOut, file: FileText, building: Building2,
};

/* ---------- contexto ---------- */

export type GuideCtx = {
  seen: Set<string>;
  open: (id: GuideId) => void;
  dismiss: (id: GuideId) => void;
  openHelp: () => void;
  reset: () => void;
  /** guia aberto agora (para os avisos de módulo não disputarem a tela com ele) */
  active: GuideId | null;
};

export const GuideContext = createContext<GuideCtx | null>(null);
export const useGuides = () => useContext(GuideContext);

/* ---------- botão "?" de cada módulo ---------- */

export function HelpButton({ id, className = "" }: { id: GuideId; className?: string }) {
  const g = useGuides();
  if (!g) return null;
  return (
    <button type="button" onClick={() => g.open(id)} aria-label={`Como funciona: ${GUIDES[id].label}`} title="Como funciona"
      className={`grid size-9 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink ${className}`}>
      <CircleHelp className="size-5" />
    </button>
  );
}

/* ---------- aviso de primeira visita de um módulo ---------- */

export function ModuleTip({ id, className = "" }: { id: GuideId; className?: string }) {
  const g = useGuides();
  // espera o tour geral terminar: um guia de cada vez
  const state = g ? guideState(g.seen, id) : "seen";
  if (!g || state === "seen" || !g.seen.has("welcome") || g.active) return null;
  const guide = GUIDES[id];
  const updated = state === "updated" && !!guide.news;
  const Icon = ICONS[guide.icon];
  return (
    // @container: o layout segue a largura do espaço onde o aviso está (modal estreito ou página larga), não a da tela
    <div role="note" className={`anim-rise @container rounded-2xl border border-accent/30 bg-accent-soft/60 ${className}`}>
      <div className="relative flex items-start gap-3 p-3.5 pr-11 @xl:items-center @xl:p-4 @xl:pr-12">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink"><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1 @xl:flex @xl:items-center @xl:gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{updated ? <>Novidades em {guide.label}</> : <>Primeira vez aqui? {guide.label}</>}</p>
            <p className="mt-0.5 text-[13px] text-ink-2">{updated ? guide.news : `${guide.summary}.`}</p>
          </div>
          <button type="button" onClick={() => g.open(id)}
            className="mt-2.5 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium whitespace-nowrap text-bg transition hover:opacity-85 @xl:mt-0">
            <BookOpen className="size-4" /> {updated ? "Ver o que mudou" : "Ver como funciona"} <span className="opacity-60">· {guide.steps.length} passos</span>
          </button>
        </div>
        <button type="button" onClick={() => g.dismiss(id)} aria-label="Dispensar dica"
          className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface hover:text-ink"><X className="size-4" /></button>
      </div>
    </div>
  );
}

/* ---------- folha com os passos do guia ---------- */

function useScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
}

function Sheet({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: React.ReactNode }) {
  useScrollLock();
  // Portal: o modal precisa ficar acima de outros diálogos (busca, compartilhar, detalhes).
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center sm:p-6">
      <div className="anim-fade absolute inset-0 bg-ink/55 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className="anim-pop scroll-thin relative flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-[28px] border border-line bg-surface text-left shadow-pop sm:max-w-lg sm:rounded-[28px]">
        <span aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line sm:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function GuideSheet({ id, onClose, finalAction }: {
  id: GuideId;
  onClose: () => void;
  /** ação extra no último passo (ex.: criar a primeira busca) */
  finalAction?: { label: string; run: () => void } | null;
}) {
  const guide = GUIDES[id];
  const [i, setI] = useState(0);
  const step = guide.steps[i];
  const last = i === guide.steps.length - 1;
  const titleId = useId();
  const primary = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const next = () => (last ? (finalAction ? finalAction.run() : onClose()) : setI((n) => n + 1));
  const prev = () => setI((n) => Math.max(0, n - 1));

  useEffect(() => { primary.current?.focus({ preventScroll: true }); }, [i]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      else if (e.key === "ArrowRight") setI((n) => Math.min(guide.steps.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    // captura: o Esc fecha só o guia, não o diálogo que está embaixo dele
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose, guide.steps.length]);

  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <div
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const t = touch.current; touch.current = null;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          if (dx > 0) prev(); else if (!last) next();
        }}
        className="flex flex-1 flex-col"
      >
        <div className="flex items-center gap-3 px-5 pt-4 sm:px-7 sm:pt-6">
          <p className="min-w-0 flex-1 truncate text-xs font-medium tracking-wider text-accent uppercase">{id === "welcome" ? "Boas-vindas" : `Guia · ${guide.label}`}</p>
          <button type="button" onClick={onClose} aria-label="Fechar guia" className="-mr-2 grid size-10 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink"><X className="size-5" /></button>
        </div>

        <div className="mt-2 flex gap-1.5 px-5 sm:px-7" aria-hidden>
          {guide.steps.map((_, n) => (
            <button key={n} type="button" tabIndex={-1} onClick={() => setI(n)} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className={`block h-full rounded-full bg-accent transition-all duration-300 ${n <= i ? "w-full" : "w-0"}`} />
            </button>
          ))}
        </div>

        <div key={i} className="anim-rise flex-1 px-5 pt-5 pb-2 sm:px-7 sm:pt-6" aria-live="polite">
          <div className="mb-5 sm:mb-6"><GuideVisual name={step.visual} /></div>
          <h2 id={titleId} className="font-display text-[2rem] leading-[1.05] sm:text-4xl">{step.title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{step.body}</p>
          {step.bullets && (
            <ul className="mt-4 space-y-2">
              {step.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-sm text-ink-2"><Check className="mt-0.5 size-4 shrink-0 text-accent" />{b}</li>
              ))}
            </ul>
          )}
          {step.mobile && (
            <p className="mt-4 flex gap-2.5 rounded-2xl bg-surface-2 px-3.5 py-3 text-sm text-ink-2 sm:hidden"><Smartphone className="mt-0.5 size-4 shrink-0 text-accent" />{step.mobile}</p>
          )}
        </div>

        <div className="pb-safe sticky bottom-0 mt-4 flex items-center gap-2 border-t border-line bg-surface/95 px-5 pt-3 backdrop-blur sm:px-7 sm:pb-6">
          {i === 0 ? (
            <button type="button" onClick={onClose} className="min-h-11 rounded-full px-4 text-sm font-medium text-ink-3 transition hover:bg-surface-2 hover:text-ink">Pular</button>
          ) : (
            <button type="button" onClick={prev} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-ink-2 transition hover:bg-surface-2"><ChevronLeft className="size-4" /> Voltar</button>
          )}
          <span className="ml-auto font-mono text-xs text-ink-3">{i + 1}/{guide.steps.length}</span>
          <button ref={primary} type="button" onClick={next}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition outline-none hover:opacity-90 focus-visible:ring-4 focus-visible:ring-accent/30 sm:px-6">
            {last ? (finalAction?.label ?? "Entendi") : <>Próximo <ChevronRight className="size-4" /></>}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- central de ajuda: todos os guias num lugar só ---------- */

export function HelpCenter({ seen, onPick, onReset, onClose }: { seen: Set<string>; onPick: (id: GuideId) => void; onReset: () => void; onClose: () => void }) {
  const titleId = useId();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const all: GuideId[] = ["welcome", ...MODULE_GUIDES];
  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <div className="flex items-start gap-3 px-5 pt-4 sm:px-7 sm:pt-7">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wider text-accent uppercase">Ajuda</p>
          <h2 id={titleId} className="font-display mt-1 text-3xl sm:text-4xl">Guias do radar</h2>
          <p className="mt-1 text-sm text-ink-2">Escolha um assunto. Cada guia leva menos de um minuto.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink"><X className="size-5" /></button>
      </div>
      <ul className="mt-5 space-y-2 px-5 sm:px-7">
        {all.map((id) => {
          const g = GUIDES[id];
          const Icon = ICONS[g.icon];
          const st = guideState(seen, id);
          return (
            <li key={id}>
              <button type="button" onClick={() => onPick(id)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-bg/60 p-3 text-left transition hover:border-ink-3/50 hover:bg-surface-2">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${id === "welcome" ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"}`}><Icon className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{g.label}</span>
                  <span className="line-clamp-2 block text-xs text-ink-3">{g.summary}</span>
                </span>
                {st === "seen" ? <CircleCheck className="size-5 shrink-0 text-ok" aria-label="visto" />
                  : <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-ink">{st === "updated" ? "NOVIDADES" : "NOVO"}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="pb-safe mt-5 flex flex-wrap items-center gap-2 border-t border-line px-5 pt-3 sm:px-7 sm:pb-6">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-3"><Lightbulb className="size-4 shrink-0 text-accent" /> O botão <CircleHelp className="inline size-3.5" /> em cada tela abre o guia dela.</p>
        <button type="button" onClick={onReset} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium transition hover:bg-surface-2">
          <RotateCcw className="size-4" /> Mostrar dicas de novo
        </button>
      </div>
    </Sheet>
  );
}
