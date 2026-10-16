export function timeAgo(ts: number | null, now = Date.now()) {
  if (!ts) return "—";
  const s = Math.round((ts - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const abs = Math.abs(s);
  if (abs < 45) return s > 0 ? "em instantes" : "agora mesmo";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return rtf.format(Math.round(s / (86400 * 30)), "month");
}

const AVATARS = ["#E8501F", "#2F6BFF", "#14A37F", "#A855F7", "#D18B00", "#E11D74", "#0EA5C6", "#5B6B16", "#7C3AED", "#DC2626"];
export function hashColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

export function initials(s: string) {
  const parts = s.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
