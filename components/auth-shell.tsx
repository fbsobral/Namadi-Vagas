import Link from "next/link";
import { Logo } from "./logo";

export function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <main className="relative z-10 grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-bg lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="text-bg [&_em]:text-bg/60"><Logo /></Link>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-6xl leading-[1.02]">{title}</h1>
          <p className="mt-5 text-lg text-bg/60">{sub}</p>
        </div>
        <Radar />
        <p className="relative z-10 text-sm text-bg/40">Buscas salvas · robô agendado · contatos no LinkedIn</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="anim-rise">{children}</div>
      </section>
    </main>
  );
}

export function Radar() {
  return (
    <svg className="pointer-events-none absolute -right-40 -bottom-40 size-[640px] opacity-90" viewBox="0 0 600 600" aria-hidden>
      {[280, 210, 140, 70].map((r) => (
        <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="currentColor" strokeOpacity=".12" />
      ))}
      <g style={{ transformOrigin: "300px 300px", animation: "spin 7s linear infinite" }}>
        <path d="M300 300 L300 20 A280 280 0 0 1 560 190 Z" fill="url(#sweep)" />
      </g>
      <defs>
        <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6a3a" stopOpacity=".5" />
          <stop offset="1" stopColor="#ff6a3a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[[380, 170], [210, 230], [440, 340], [330, 420], [170, 360]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#ff6a3a" style={{ animation: `ping-soft 2.4s ${i * 0.5}s ease-out infinite`, ["--dot" as string]: "#ff6a3a" }} />
      ))}
    </svg>
  );
}
