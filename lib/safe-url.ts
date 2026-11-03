// Links vêm de fontes externas (raspagem): só http(s) vira link clicável (client-safe).
export function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:" ? p.href : null;
  } catch {
    return null;
  }
}

/** Para href: devolve "#" quando o endereço não é http(s). */
export const hrefOf = (u: string | null | undefined) => safeUrl(u) ?? "#";
