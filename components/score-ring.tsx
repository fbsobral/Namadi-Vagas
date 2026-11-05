// Anel de pontuação (0–100). Sem hooks: serve em componentes de servidor e de cliente.
// A animação de preenchimento é CSS (respeita "reduzir movimento").

export const scoreTone = (n: number) => (n >= 85 ? "var(--ok)" : n >= 70 ? "#14A37F" : n >= 50 ? "#E0A100" : "var(--accent)");

export function ScoreRing({ value, size = 120, stroke, suffix = "", label, className = "" }: {
  value: number; size?: number; stroke?: number; suffix?: string; label?: string; className?: string;
}) {
  const w = stroke ?? Math.max(5, Math.round(size / 11));
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }} role="img" aria-label={label ?? `${v}${suffix} de 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={w} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreTone(v)} strokeWidth={w} strokeLinecap="round"
          strokeDasharray={c} className="ring-fill" style={{ ["--ring-c" as string]: c, ["--ring-to" as string]: c * (1 - v / 100), strokeDashoffset: c * (1 - v / 100) }} />
      </svg>
      <span className="absolute font-semibold tabular-nums" style={{ fontSize: Math.round(size * (suffix ? 0.24 : 0.3)) }}>{v}{suffix}</span>
    </span>
  );
}

export function Bar({ value, className = "" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className={`block h-1.5 overflow-hidden rounded-full bg-surface-2 ${className}`}>
      <span className="bar-fill block h-full rounded-full" style={{ width: `${v}%`, background: scoreTone(v) }} />
    </span>
  );
}
