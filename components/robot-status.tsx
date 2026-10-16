import { timeAgo } from "@/lib/format";
import type { RunRow } from "@/lib/db";

export function RobotStatus({ lastBeat, online }: { lastBeat: number | null; online: boolean }) {
  return (
    <span
      title={lastBeat ? `Último sinal ${timeAgo(lastBeat)}` : "O agendador ainda não deu sinal"}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${online ? "border-ok/30 bg-ok-soft text-ok" : "border-accent/40 bg-accent-soft text-accent"}`}
    >
      <span className={`size-2 rounded-full ${online ? "pulse-dot bg-ok" : "bg-accent"}`} style={{ ["--dot" as string]: online ? "var(--ok)" : "var(--accent)" }} />
      {online ? "Robô online" : "Robô parado"}
      <span className="font-normal opacity-70">· sinal {timeAgo(lastBeat)}</span>
    </span>
  );
}

export function RunHistory({ runs }: { runs: RunRow[] }) {
  if (!runs.length) return null;
  return (
    <details className="group mt-4 max-w-xl rounded-2xl border border-line bg-surface/70 px-4 py-3 text-sm">
      <summary className="cursor-pointer list-none font-medium text-ink-2 marker:hidden">
        Histórico do robô <span className="font-normal text-ink-3">· {runs.length} últimas rodadas</span>
      </summary>
      <ul className="mt-3 space-y-2">
        {runs.map((r) => (
          <li key={r.id} className="flex items-start gap-3">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${r.error ? "bg-accent" : "bg-ok"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-ink-2">
                {timeAgo(r.started_at)} · {r.error ? "falhou" : `${r.new_count} nova${r.new_count === 1 ? "" : "s"} · ${r.total_count} vaga${r.total_count === 1 ? "" : "s"} válida${r.total_count === 1 ? "" : "s"} de ${r.raw_count} resultados do Google`}
                {r.finished_at && <span className="text-ink-3"> · {Math.max(1, Math.round((r.finished_at - r.started_at) / 1000))}s</span>}
              </p>
              {r.error && <p className="truncate text-xs text-accent" title={r.error}>{r.error}</p>}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
