export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--ink)" />
        <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--bg)" strokeOpacity=".35" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="5" fill="none" stroke="var(--bg)" strokeOpacity=".6" strokeWidth="1.5" />
        <path d="M16 16 L24.5 9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2" fill="var(--accent)" />
      </svg>
      <span className="font-display text-[22px] leading-none tracking-tight">Namadi <em className="text-ink-2">vagas</em></span>
    </span>
  );
}
