import "server-only";
import * as cheerio from "cheerio";
import { driverTerms, evaluateJob, specToBoolean, type QuerySpec } from "./query";

export type Found = {
  title: string;
  company: string;
  url: string;
  snippet: string;
  location: string | null;
  source: "linkedin" | "gupy" | "web" | "demo";
  description?: string | null; // texto da vaga, quando a fonte entrega
  filteredReason?: string | null; // bateu com a busca, mas uma exclusão "na descrição" pegou
};

type Recency = "day" | "week" | "month" | "any";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (a: number, b: number) => a + Math.random() * (b - a);
const DAYS: Record<Recency, number> = { day: 1, week: 7, month: 30, any: 3650 };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const isRemote = (loc: string) => /remot|home ?office|anywhere/.test(norm(loc));

const UF: Record<string, string> = {
  ac: "acre", al: "alagoas", ap: "amapa", am: "amazonas", ba: "bahia", ce: "ceara", df: "distrito federal", es: "espirito santo",
  go: "goias", ma: "maranhao", mt: "mato grosso", ms: "mato grosso do sul", mg: "minas gerais", pa: "para", pb: "paraiba",
  pr: "parana", pe: "pernambuco", pi: "piaui", rj: "rio de janeiro", rn: "rio grande do norte", rs: "rio grande do sul",
  ro: "rondonia", rr: "roraima", sc: "santa catarina", sp: "sao paulo", se: "sergipe", to: "tocantins",
};

/* ---------------------------------- Gupy ---------------------------------- */

type GupyJob = {
  id: number | string; name: string; description?: string; careerPageName?: string; city?: string; state?: string;
  workplaceType?: string; publishedDate?: string; jobUrl: string;
};

const WORKPLACE: Record<string, string> = { remote: "Remoto", hybrid: "Híbrido", "on-site": "Presencial" };

/** API pública do portal da Gupy (a mesma que o site usa). Sem CAPTCHA, JSON estruturado. */
export async function gupyFetch(spec: QuerySpec, location: string, recency: Recency): Promise<{ jobs: Found[]; raw: number }> {
  const terms = driverTerms(spec);
  if (!terms.length) return { jobs: [], raw: 0 };
  const remote = isRemote(location);
  const locTokens = remote
    ? []
    : location.split(/[,/·-]/).map((t) => norm(t.trim())).filter(Boolean).map((t) => UF[t] ?? t);
  const since = Date.now() - DAYS[recency] * 86_400_000;

  const byId = new Map<string, GupyJob>();
  let raw = 0;
  for (const term of terms) {
    for (let offset = 0; offset < 100; offset += 50) {
      const qs = new URLSearchParams({ jobName: term, limit: "50", offset: String(offset) });
      if (remote) qs.set("workplaceType", "remote");
      const res = await fetch(`https://portal.gupy.io/api/job-search/jobs?${qs}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Gupy respondeu ${res.status}`);
      const body = (await res.json()) as { data?: GupyJob[]; pagination?: { total?: number } };
      const page = body.data ?? [];
      raw += page.length;
      for (const j of page) byId.set(String(j.id), j);
      if (page.length < 50 || offset + 50 >= (body.pagination?.total ?? 0)) break;
      await sleep(jitter(150, 350));
    }
  }

  const jobs: Found[] = [];
  for (const j of byId.values()) {
    const description = cheerio.load(`<div>${j.description ?? ""}</div>`)("div").text().replace(/\s+/g, " ").trim();
    const v = evaluateJob(spec, { title: `${j.name} ${j.careerPageName ?? ""}`, text: description });
    if (v.verdict === "drop") continue;
    if (j.publishedDate && new Date(j.publishedDate).getTime() < since) continue;
    if (locTokens.length) {
      const where = norm(`${j.city ?? ""} ${j.state ?? ""}`);
      if (!locTokens.some((t) => where.includes(t))) continue;
    }
    const place = [j.city, j.state].filter(Boolean).join("/");
    const wp = WORKPLACE[j.workplaceType ?? ""];
    jobs.push({
      title: j.name.trim().slice(0, 160),
      company: (j.careerPageName ?? "Empresa").trim().slice(0, 80),
      url: j.jobUrl,
      snippet: description.slice(0, 300),
      description: description.slice(0, 4000),
      filteredReason: v.verdict === "filtered" ? v.reason : null,
      location: [place, wp].filter(Boolean).join(" · ") || null,
      source: "gupy",
    });
  }
  return { jobs, raw };
}

/* -------------------------------- LinkedIn -------------------------------- */

const linkedinGet = (qs: URLSearchParams) =>
  fetch(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${qs}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5" },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });


/**
 * Endpoint "guest" do LinkedIn Jobs (o mesmo que o site público usa para listar vagas).
 * Aceita busca booleana. O LinkedIn limita o ritmo (429), então espaçamos as páginas.
 */
export async function linkedinFetch(spec: QuerySpec, location: string, recency: Recency): Promise<{ jobs: Found[]; raw: number }> {
  const keywords = specToBoolean(spec);
  if (!keywords) return { jobs: [], raw: 0 };
  const tpr = { day: "r86400", week: "r604800", month: "r2592000", any: "" }[recency];

  const out = new Map<string, Found>();
  let raw = 0;
  for (let page = 0; page < 3; page++) {
    const qs = new URLSearchParams({ keywords, location: location.trim() || "Brazil", start: String(page * 10) });
    if (tpr) qs.set("f_TPR", tpr);
    if (isRemote(location)) qs.set("f_WT", "2");
    let res = await linkedinGet(qs);
    if ((res.status === 429 || res.status === 999) && page === 0) {
      await sleep(jitter(7000, 11000)); // uma nova tentativa depois de esfriar
      res = await linkedinGet(qs);
    }
    if (res.status === 429 || res.status === 999) {
      if (page === 0) throw new Error("LinkedIn limitou as consultas (429). Vou tentar de novo em até 30 min.");
      break; // já temos páginas anteriores
    }
    if (!res.ok) {
      if (page === 0) throw new Error(`LinkedIn respondeu ${res.status}`);
      break;
    }
    const $ = cheerio.load(await res.text());
    let got = 0;
    $("li").each((_, el) => {
      const a = $(el).find("a.base-card__full-link").first();
      const href = a.attr("href");
      const title = $(el).find(".base-search-card__title").first().text().trim();
      if (!href || !title) return;
      got++;
      raw++;
      if (evaluateJob(spec, { title }, { trustAny: true }).verdict === "drop") return;
      let url = href;
      try {
        const u = new URL(href);
        url = `https://www.linkedin.com${u.pathname}`;
      } catch { /* mantém */ }
      if (out.has(url)) return;
      out.set(url, {
        title: title.slice(0, 160),
        company: $(el).find(".base-search-card__subtitle").first().text().trim().slice(0, 80) || "Empresa",
        url,
        snippet: "",
        location: $(el).find(".job-search-card__location").first().text().trim() || null,
        source: "linkedin",
      });
    });
    if (got < 5) break;
    await sleep(jitter(1800, 3200));
  }
  return { jobs: [...out.values()], raw };
}

/**
 * Descrição completa de uma vaga do LinkedIn (página de detalhe pública). Devolve null se a vaga sumiu;
 * lança erro com "429" quando o LinkedIn limita o ritmo, para o chamador parar e tentar na próxima rodada.
 */
export async function linkedinDescription(url: string): Promise<string | null> {
  const id = url.match(/(\d{8,})\/?(?:[?#].*)?$/)?.[1];
  if (!id) return null;
  const res = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5" },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (res.status === 429 || res.status === 999) throw new Error("LinkedIn limitou as consultas (429)");
  if (!res.ok) return null;
  const $ = cheerio.load(await res.text());
  const el = $(".show-more-less-html__markup").first();
  el.find("br").replaceWith("\n");
  el.find("li").each((_, li) => { $(li).prepend("• "); $(li).append("\n"); });
  el.find("p, div, ul").each((_, n) => { $(n).append("\n"); });
  const text = el.text().replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
  return text ? text.slice(0, 4000) : null;
}
