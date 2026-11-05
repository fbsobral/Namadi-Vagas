"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import type { AiJob } from "@/lib/db";

/*
 * Análises de IA em segundo plano (currículo, LinkedIn, adaptar): o servidor termina mesmo se a pessoa trocar de tela.
 * Este aviso aparece em qualquer tela do painel, acompanha o andamento e avisa quando fica pronto.
 */

type Ctx = { jobs: AiJob[]; track: (id: string) => void; busy: (kind: AiJob["kind"], refId?: string | null) => boolean };
const JobsContext = createContext<Ctx | null>(null);
export const useJobs = () => useContext(JobsContext);

const KIND: Record<AiJob["kind"], { doing: string; done: string; href: (j: AiJob) => string }> = {
  resume: { doing: "Analisando o currículo", done: "Currículo analisado", href: (j) => `/dashboard/curriculo${j.result_id ? `?cv=${j.result_id}` : ""}` },
  adapt: { doing: "Criando a versão adaptada", done: "Nova versão pronta", href: (j) => `/dashboard/curriculo${j.result_id ? `?cv=${j.result_id}` : ""}` },
  linkedin: { doing: "Analisando o perfil do LinkedIn", done: "Perfil analisado", href: () => "/dashboard/linkedin" },
};

export function BackgroundJobs({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [tick, setTick] = useState(0);
  const prev = useRef<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    const res = await fetch("/api/jobs", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const { jobs: next } = (await res.json()) as { jobs: AiJob[] };
    // terminou algo que estava em andamento: atualiza a tela atual com o resultado
    if (next.some((j) => j.status !== "pending" && prev.current.get(j.id) === "pending")) router.refresh();
    prev.current = new Map(next.map((j) => [j.id, j.status]));
    setJobs(next);
  }, [router]);

  // ao abrir qualquer tela do painel: retoma o que estiver em andamento
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load, tick]);

  const pending = jobs.some((j) => j.status === "pending");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => void load(), 2500);
    return () => clearInterval(t);
  }, [pending, load]);

  const ack = (id: string) => {
    setJobs((js) => js.filter((j) => j.id !== id));
    void fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
  };

  const ctx = useMemo<Ctx>(() => ({
    jobs,
    track: (id) => {
      prev.current.set(id, "pending");
      setJobs((js) => (js.some((j) => j.id === id) ? js : [{ id, kind: "resume", label: "", ref_id: null, status: "pending", result_id: null, note: null, error: null, created_at: Date.now(), finished_at: null }, ...js]));
      setTick((n) => n + 1);
    },
    busy: (kind, refId) => jobs.some((j) => j.status === "pending" && j.kind === kind && (refId === undefined || j.ref_id === refId)),
  }), [jobs]);

  return (
    <JobsContext.Provider value={ctx}>
      {children}
      {jobs.length > 0 && (
        <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-[35] flex flex-col items-center gap-2 px-3 pt-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end sm:px-0" aria-live="polite">
          {jobs.map((j) => {
            const k = KIND[j.kind] ?? KIND.resume;
            return (
              <div key={j.id} role="status" className={`anim-pop pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-pop sm:w-[380px] ${j.status === "error" ? "border-accent/40 bg-accent-soft" : "border-line bg-surface"}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${j.status === "done" ? "bg-ok text-white" : j.status === "error" ? "bg-accent text-accent-ink" : "bg-surface-2 text-accent"}`}>
                  {j.status === "pending" ? <Loader2 className="spin size-4" /> : j.status === "done" ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{j.status === "pending" ? k.doing : j.status === "done" ? k.done : "A análise não terminou"}{j.label ? <span className="font-normal text-ink-3"> · {j.label}</span> : null}</p>
                  <p className="truncate text-xs text-ink-3">{j.status === "pending" ? "Pode continuar navegando: avisamos quando terminar." : j.status === "done" ? j.note ?? "Pronto." : j.error}</p>
                </div>
                {j.status === "done" && <Link href={k.href(j)} onClick={() => ack(j.id)} className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-bg">Ver</Link>}
                {j.status !== "pending" && <button onClick={() => ack(j.id)} aria-label="Fechar aviso" className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>}
              </div>
            );
          })}
        </div>
      )}
    </JobsContext.Provider>
  );
}
