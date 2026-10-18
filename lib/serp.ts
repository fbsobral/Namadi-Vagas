import "server-only";
import { chromium, type Browser, type BrowserContext } from "playwright-core";
import { getKv, setKv } from "./db";
import * as cheerio from "cheerio";

export type SerpResult = { title: string; link: string; snippet: string; date?: string; lines?: string[] };
type Recency = "day" | "week" | "month" | "any";
type Opts = { recency?: Recency; page?: number; num?: number; engines?: string[] };

/** Modo demo só liga se você pedir (DEMO_MODE=1). O robô é próprio: não depende de API de terceiros. */
export const isDemoMode = () => process.env.DEMO_MODE === "1";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (a: number, b: number) => a + Math.random() * (b - a);

/* ---------- navegador compartilhado + fila (um Google por vez, em ritmo humano) ---------- */

const g = globalThis as unknown as {
  __vagasBrowser?: Promise<Browser>;
  __vagasPersist?: Promise<BrowserContext>;
  __vagasQueue?: Promise<unknown>;
  __vagasBlock?: { until: number; at: number };
};

/* ---------- pausa do Google após CAPTCHA: persistente (sobrevive a reinício) e crescente ---------- */

const BLOCK_STEPS_MIN = [30, 120, 360, 720];
export const hhmm = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

/** Até quando o Google está em pausa (0 = livre). */
export async function googleBlockedUntil(): Promise<number> {
  if (g.__vagasBlock && Date.now() - g.__vagasBlock.at < 15_000) return g.__vagasBlock.until;
  const kv = await getKv("google_block");
  const until = kv ? (JSON.parse(kv.value) as { until?: number }).until ?? 0 : 0;
  g.__vagasBlock = { until, at: Date.now() };
  return until;
}

async function noteBlocked() {
  const kv = await getKv("google_block");
  const strikes = (kv ? (JSON.parse(kv.value) as { strikes?: number }).strikes ?? 0 : 0) + 1;
  const until = Date.now() + BLOCK_STEPS_MIN[Math.min(strikes - 1, BLOCK_STEPS_MIN.length - 1)] * 60_000;
  await setKv("google_block", JSON.stringify({ until, strikes }));
  g.__vagasBlock = { until, at: Date.now() };
  return until;
}

async function noteOk() {
  const kv = await getKv("google_block");
  if (kv && ((JSON.parse(kv.value) as { strikes?: number }).strikes ?? 0) > 0) {
    await setKv("google_block", JSON.stringify({ until: 0, strikes: 0 }));
    g.__vagasBlock = { until: 0, at: Date.now() };
  }
}

/** PROXY_URL (opcional), ex.: http://usuario:senha@host:porta — útil na VPS, onde IP de datacenter leva CAPTCHA com mais frequência. */
function proxyOpt() {
  const raw = process.env.PROXY_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(u.username) || undefined, password: decodeURIComponent(u.password) || undefined };
  } catch {
    return undefined;
  }
}
const launchBase = () => ({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined, // ex.: "chrome" no seu Mac
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
  proxy: proxyOpt(),
});
const ctxOpts = {
  userAgent: UA,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  viewport: { width: 1366, height: 860 },
  extraHTTPHeaders: { "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6" },
};

function browser() {
  if (!g.__vagasBrowser) {
    g.__vagasBrowser = chromium
      .launch(launchBase())
      .then((b) => {
        b.on("disconnected", () => { g.__vagasBrowser = undefined; });
        return b;
      })
      .catch((e) => { g.__vagasBrowser = undefined; throw e; });
  }
  return g.__vagasBrowser;
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = (g.__vagasQueue ?? Promise.resolve()).then(fn, fn);
  g.__vagasQueue = run.catch(() => undefined).then(() => sleep(jitter(1500, 3500)));
  return run;
}

/* ---------- Google (Playwright) ---------- */

/** BROWSER_PROFILE_DIR (opcional): perfil persistente — guarda cookies entre buscas, como um visitante que volta (costuma reduzir CAPTCHA). */
function persistent() {
  if (!g.__vagasPersist) {
    g.__vagasPersist = chromium
      .launchPersistentContext(process.env.BROWSER_PROFILE_DIR!, { ...launchBase(), ...ctxOpts })
      .then(async (c) => {
        await c.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
        c.on("close", () => { g.__vagasPersist = undefined; });
        return c;
      })
      .catch((e) => { g.__vagasPersist = undefined; throw e; });
  }
  return g.__vagasPersist;
}

async function withPage<T>(fn: (p: import("playwright-core").Page, ctx: import("playwright-core").BrowserContext) => Promise<T>): Promise<T> {
  if (process.env.BROWSER_PROFILE_DIR) {
    const ctx = await persistent();
    const page = await ctx.newPage();
    try {
      return await fn(page, ctx);
    } finally {
      await page.close().catch(() => {});
    }
  }
  const b = await browser();
  const ctx = await b.newContext(ctxOpts);
  await ctx.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
  try {
    return await fn(await ctx.newPage(), ctx);
  } finally {
    await ctx.close().catch(() => {});
  }
}



class Blocked extends Error {}

async function google(q: string, { recency = "any", page = 1 }: Opts): Promise<SerpResult[]> {
  const pausedUntil = await googleBlockedUntil();
  if (pausedUntil > Date.now()) throw new Blocked(`Google em pausa após CAPTCHA, volta depois das ${hhmm(pausedUntil)}`);

  return enqueue(() => withPage(async (p, ctx) => {
    {
      const tbs = { day: "qdr:d", week: "qdr:w", month: "qdr:m", any: "" }[recency];
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=br&start=${(page - 1) * 10}&pws=0${tbs ? `&tbs=${tbs}` : ""}`;
      await p.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });

      // tela de consentimento (comum em IP europeu)
      if (/consent\./.test(p.url())) {
        await p.getByRole("button", { name: /rejeitar tudo|reject all/i }).first().click({ timeout: 5000 }).catch(() => {});
        await p.waitForLoadState("domcontentloaded").catch(() => {});
      }

      const blocked = /\/sorry\/|recaptcha/i.test(p.url()) || (await p.locator("form#captcha-form, #recaptcha, iframe[src*='recaptcha']").count()) > 0;
      if (blocked) {
        const until = await noteBlocked();
        throw new Blocked(`Google pediu CAPTCHA, volta depois das ${hhmm(until)}`);
      }

      await p.waitForSelector("#search a h3, #rso a h3", { timeout: 8000 }).catch(() => {});
      const rows = await p.evaluate(() => {
        const out: { title: string; link: string; snippet: string; lines: string[] }[] = [];
        const seen = new Set<string>();
        document.querySelectorAll("#search a:has(h3), #rso a:has(h3)").forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          const title = a.querySelector("h3")?.textContent?.trim() ?? "";
          if (!href || !title || seen.has(href)) return;
          seen.add(href);
          // sobe até o bloco do resultado e pega a maior linha de texto que não seja título/URL
          let box: Element | null = a.closest(".MjjYud, .tF2Cxc, .g");
          if (!box) { box = a; for (let i = 0; i < 5 && box.parentElement; i++) box = box.parentElement; }
          const lines = ((box as HTMLElement).innerText || "").split("\n").map((l) => l.trim()).filter(Boolean)
            .filter((l) => l !== title && !/^https?:|›/.test(l) && l.length > 35);
          const all = ((box as HTMLElement).innerText || "").split("\n").map((l) => l.trim()).filter((l) => l && l !== title && !/^https?:|›/.test(l));
          const snippet = lines.sort((x, y) => y.length - x.length)[0] ?? "";
          out.push({ title, link: href, snippet: snippet.slice(0, 300), lines: all.slice(0, 8).map((l) => l.slice(0, 200)) });
        });
        return out;
      });

      // O Google embrulha os links em /goto?url=<token>; o 302 revela a URL real.
      for (const r of rows) {
        if (!/google\.[a-z.]+\/(goto|url)\?/.test(r.link)) continue;
        try {
          const res = await ctx.request.get(r.link, { maxRedirects: 0, timeout: 8000 });
          const loc = res.headers()["location"];
          if (loc && /^https?:/.test(loc)) r.link = loc;
        } catch { /* fica com o link embrulhado e é descartado abaixo */ }
        await sleep(jitter(80, 220));
      }
      const rowsOk = rows.filter((r) => !/google\.[a-z.]+\//.test(r.link));
      if (!rowsOk.length && rows.length) throw new Blocked("não consegui resolver os links do Google");
      if (rowsOk.length) await noteOk(); // Google respondeu normalmente: zera o histórico de bloqueios
      return rowsOk;
    }
  }));
}

/* ---------- DuckDuckGo e Bing (também no navegador real) ---------- */

async function duckduckgo(q: string, { recency = "any", page = 1 }: Opts): Promise<SerpResult[]> {
  if (page > 1) return [];
  const df = { day: "d", week: "w", month: "m", any: "" }[recency];
  return enqueue(() => withPage(async (p) => {
    await p.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=br-pt${df ? `&df=${df}` : ""}`, { waitUntil: "domcontentloaded", timeout: 25000 });
    const html = await p.content();
    if (!/result__a/.test(html)) throw new Blocked(/anomaly|captcha|challenge/i.test(html) ? "DuckDuckGo pediu verificação" : "DuckDuckGo sem resultados");
    const $ = cheerio.load(html);
    const out: SerpResult[] = [];
    $(".result").each((_, el) => {
      const a = $(el).find("a.result__a").first();
      let href = a.attr("href") ?? "";
      if (href.startsWith("//")) href = `https:${href}`;
      try {
        const u = new URL(href);
        if (u.searchParams.get("uddg")) href = u.searchParams.get("uddg")!;
      } catch { /* mantém */ }
      const title = a.text().trim();
      if (!/^https?:/.test(href) || !title) return;
      out.push({ title, link: href, snippet: $(el).find(".result__snippet").first().text().trim() });
    });
    return out;
  }));
}

function bingUnwrap(href: string) {
  try {
    const u = new URL(href);
    const t = u.searchParams.get("u");
    if (u.hostname.endsWith("bing.com") && t?.startsWith("a1")) return Buffer.from(t.slice(2), "base64url").toString("utf8");
  } catch { /* mantém */ }
  return href;
}

async function bing(q: string, { recency = "any", page = 1 }: Opts): Promise<SerpResult[]> {
  const ez = { day: "ez1", week: "ez2", month: "ez3", any: "" }[recency];
  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=pt-BR&cc=BR&count=20&first=${(page - 1) * 20 + 1}${ez ? `&filters=${encodeURIComponent(`ex1:"${ez}"`)}` : ""}`;
  return enqueue(() => withPage(async (p) => {
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await p.waitForSelector("li.b_algo", { timeout: 6000 }).catch(() => {});
    const $ = cheerio.load(await p.content());
    const out: SerpResult[] = [];
    $("li.b_algo").each((_, el) => {
      const a = $(el).find("h2 a").first();
      const link = bingUnwrap(a.attr("href") ?? "");
      const title = a.text().trim();
      if (!/^https?:/.test(link) || !title) return;
      out.push({ title, link, snippet: $(el).find(".b_caption p, p.b_lineclamp2, p.b_lineclamp3, p.b_lineclamp4").first().text().trim() });
    });
    return out;
  }));
}

/* ---------- orquestração ---------- */

const ENGINES: Record<string, (q: string, o: Opts) => Promise<SerpResult[]>> = { google, duckduckgo, bing };

/**
 * Busca com robô próprio. Tenta os motores em ordem (SEARCH_ENGINES, padrão google,duckduckgo,bing)
 * e usa o próximo quando um é bloqueado ou volta vazio.
 */
export async function googleSearch(q: string, opts: Opts = {}): Promise<SerpResult[]> {
  const order = (opts.engines ?? (process.env.SEARCH_ENGINES || "google,duckduckgo,bing").split(",")).map((s) => s.trim()).filter((s) => s in ENGINES);
  const errors: string[] = [];
  for (const name of order) {
    try {
      const r = await ENGINES[name](q, opts);
      if (r.length) return r;
      errors.push(`${name}: sem resultados`);
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  // Página 2+ vazia é normal; só reporta erro se nenhum motor respondeu na página 1.
  if ((opts.page ?? 1) === 1 && errors.some((e) => !e.endsWith("sem resultados"))) throw new Error(errors.join(" · "));
  return [];
}
