import type { SerpResult } from "./serp";

const JOB_HOSTS: [RegExp, string][] = [
  [/linkedin\.com\/jobs/, "linkedin"],
  [/gupy\.io/, "gupy"],
  [/greenhouse\.io/, "greenhouse"],
  [/lever\.co/, "lever"],
  [/ashbyhq\.com/, "ashby"],
  [/workable\.com/, "workable"],
  [/indeed\.com/, "indeed"],
  [/glassdoor\./, "glassdoor"],
  [/vagas\.com\.br/, "vagas"],
  [/catho\.com\.br/, "catho"],
  [/infojobs\.com\.br/, "infojobs"],
];

// Padrões de URL que identificam a página de UMA vaga (não listagem, não artigo, não "carreiras" genérico).
const SINGLE_JOB_URL: [RegExp, RegExp][] = [
  [/linkedin\.com/, /\/jobs\/view\//],
  [/gupy\.io/, /\/jobs\/\d+/],
  [/greenhouse\.io/, /\/jobs\/\d+|gh_jid=/],
  [/lever\.co/, /\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-/],
  [/ashbyhq\.com/, /\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-/],
  [/workable\.com/, /\/j\/[A-Z0-9]+/i],
  [/indeed\.com/, /viewjob|[?&](jk|vjk)=|\/rc\/clk|\/pagead\//],
  [/glassdoor\./, /job-listing|partner\/jobListing|\/vaga/i],
  [/vagas\.com\.br/, /\/vagas\/v\d+/],
  [/catho\.com\.br/, /\/vagas\/.+\/\d+|\/vagas\/.+-\d+/],
  [/infojobs\.com\.br/, /\/vaga-de-|\/vagas-de-emprego.*\.aspx\?|\/vaga-/],
];

// Em sites quaisquer: precisa de um segmento "vaga/job/position" seguido de identificador (número ou slug longo).
const GENERIC_SINGLE = /\/(job|jobs|vaga|vagas|position|positions|opening|openings|requisition|posting|postings|oportunidade|oportunidades|apply|careers?|carreiras?)\/(?:[^/?#]*\d[^/?#]*|[a-z0-9]+(?:-[a-z0-9]+){2,})(?:[/?#]|$)/i;
const GENERIC_QS = /[?&](jobid|job_id|jid|gh_jid|requisitionid|reqid|vacancyid)=/i;

// Títulos/descrições que denunciam listagem, curso, artigo ou guia.
const JUNK_TITLE = new RegExp(
  [
    "^(vagas?|jobs?|empregos?)\\s+(de|em|para|in|for)\\b",
    "\\b\\d[\\d.,]*\\+?\\s+(vagas?|jobs?|empregos?|resultados?)\\b",
    "\\bjobs?\\s+in\\b",
    "careers?\\s*(&|and|e)\\s*job",
    "oportunidades de (carreira|emprego|trabalho)",
    "o que [ée]\\b|what is\\b|como (ser|se tornar|come[çc]ar|escolher)|how to\\b|guia (completo|de|para)|passo a passo",
    "curso|faculdade|gradua[çc][ãa]o|p[óo]s-gradua|bolsa|vestibular|mba\\b|certifica[çc][ãa]o|bootcamp|tutorial|aula\\b",
    "sal[áa]rio|m[ée]dia salarial|salary|quanto ganha|piso salarial",
    "\\b(blog|artigo|not[íi]cia|glossário|defini[çc][ãa]o|conceito|significado)\\b",
    "(trabalhe|work) (conosco|with us)$|^(careers?|carreiras?)$|^p[áa]gina de carreiras",
  ].join("|"),
  "i",
);
const JUNK_SNIPPET = /m[ée]dia salarial|sal[áa]rio m[ée]dio|average salary|saiba tudo sobre|learn about our (courses?|programs?)|inscri[çc][õo]es abertas para o curso|oferece(mos)? cursos?/i;
const NOT_JOB_HOSTS = /(wikipedia|youtube|facebook|instagram|twitter|x\.com|reddit|medium|quora|pinterest|tiktok|querobolsa|rdstation|coursera|udemy|alura|hotmart|escolaweb|infoescola|brasilescola|mundoeducacao|estudar|\.edu(\.br)?\/)/i;

export function detectSource(url: string) {
  for (const [re, key] of JOB_HOSTS) if (re.test(url)) return key;
  return "web";
}

export function normalizeUrl(raw: string) {
  try {
    const u = new URL(raw);
    const keep = u.hostname.includes("indeed") ? ["jk", "vjk"] : [];
    const params = new URLSearchParams();
    for (const k of keep) if (u.searchParams.get(k)) params.set(k, u.searchParams.get(k)!);
    const qs = params.toString();
    return `${u.origin}${u.pathname.replace(/\/+$/, "")}${qs ? `?${qs}` : ""}`.toLowerCase();
  } catch {
    return raw;
  }
}

function titleCase(s: string) {
  return s.replace(/[-_]+/g, " ").replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

function companyFromUrl(url: string) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    const h = u.hostname.replace(/^www\./, "");
    if (/greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com/.test(h) && seg[0] && !/^(jobs|j|embed)$/.test(seg[0])) return titleCase(seg[0]);
    if (/gupy\.io/.test(h) && h.split(".").length > 2) return titleCase(h.split(".")[0]);
    return "";
  } catch {
    return "";
  }
}

const SITE_SUFFIX = /\s*[|\-–—·]\s*(LinkedIn|Indeed(\.com)?(\s*Brasil)?|Glassdoor|Gupy|Greenhouse|Lever|Catho|Vagas(\.com(\.br)?)?|InfoJobs|Workable|Ashby)[^|]*$/i;

export function parseTitle(rawTitle: string, url: string) {
  let t = rawTitle.replace(/\s+/g, " ").trim().replace(SITE_SUFFIX, "").trim();
  let company = "";
  let location: string | null = null;

  // "Acme hiring Senior Designer in São Paulo, Brazil"
  let m = t.match(/^(.+?)\s+(?:is hiring|hiring|está contratando|está recrutando|contrata|recrutando)\s+(.+?)(?:\s+(?:in|em)\s+(.+))?$/i);
  if (m) {
    company = m[1]; t = m[2]; location = m[3] ?? null;
  } else if ((m = t.match(/^Job Application for\s+(.+?)\s+at\s+(.+)$/i))) {
    t = m[1]; company = m[2];
  } else if ((m = t.match(/^(.+?)\s+(?:at|na|@)\s+(.+?)(?:\s+[-|–]\s+.*)?$/i)) && m[2].length < 40) {
    t = m[1]; company = m[2];
  } else {
    const parts = t.split(/\s+[-|–—]\s+/);
    if (parts.length >= 2) {
      t = parts[0];
      company = parts[1];
      if (parts[2]) location = parts[2];
    }
  }
  company = company.replace(/\s*\|.*$/, "").trim() || companyFromUrl(url) || new URL(url).hostname.replace(/^www\./, "");
  t = t.replace(/^(vaga|job)\s*(de|para|:)?\s*/i, "").trim() || rawTitle;
  return { title: t.slice(0, 160), company: company.slice(0, 80), location: location?.slice(0, 80) ?? null };
}

/** Só passa página de uma vaga específica. Listagens, cursos, artigos e páginas de carreira genéricas são descartados. */
export function looksLikeJob(r: SerpResult) {
  if (NOT_JOB_HOSTS.test(r.link)) return false;
  if (JUNK_TITLE.test(r.title) || JUNK_SNIPPET.test(r.snippet)) return false;
  if (/linkedin\.com\/(in|company|pub|posts|pulse|learning|school)\//.test(r.link)) return false;

  const known = SINGLE_JOB_URL.find(([host]) => host.test(r.link));
  if (known) return known[1].test(r.link);

  try {
    const u = new URL(r.link);
    if (/\/(search|job-search|busca|resultados?|categoria|category|tag|blog|artigos?|noticias?)(\/|$)/i.test(u.pathname)) return false;
    return GENERIC_SINGLE.test(u.pathname + u.search) || GENERIC_QS.test(u.search);
  } catch {
    return false;
  }
}
