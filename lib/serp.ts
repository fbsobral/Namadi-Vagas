import "server-only";

export type SerpResult = { title: string; link: string; snippet: string; date?: string };

export const isDemoMode = () => !process.env.SERPER_API_KEY;

/** Pesquisa no Google via Serper.dev (API oficial de SERP — não raspamos o HTML do Google). */
export async function googleSearch(
  q: string,
  opts: { recency?: "day" | "week" | "month" | "any"; page?: number; num?: number } = {},
): Promise<SerpResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY ausente");

  const tbs = { day: "qdr:d", week: "qdr:w", month: "qdr:m", any: undefined }[opts.recency ?? "any"];
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, gl: "br", hl: "pt-br", num: opts.num ?? 20, page: opts.page ?? 1, ...(tbs ? { tbs } : {}) }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Serper ${res.status}: ${body.slice(0, 160)}`);
  }
  const data = (await res.json()) as { organic?: { title?: string; link?: string; snippet?: string; date?: string }[] };
  return (data.organic ?? [])
    .filter((r) => r.link && r.title)
    .map((r) => ({ title: r.title!, link: r.link!, snippet: r.snippet ?? "", date: r.date }));
}
