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

const JOBISH = /\b(vaga|vagas|job|jobs|hiring|contrata|contratando|career|careers|carreira|carreiras|opening|openings|apply|candidate|emprego|oportunidade|recrut)/i;
const NOT_JOB_HOSTS = /(wikipedia|youtube|facebook|instagram|twitter|x\.com|reddit|medium|quora|pinterest|tiktok)\./i;

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

export function looksLikeJob(r: SerpResult) {
  if (NOT_JOB_HOSTS.test(r.link)) return false;
  if (/linkedin\.com\/(in|company|pub|posts|pulse)\//.test(r.link)) return false;
  if (detectSource(r.link) !== "web") return true;
  return JOBISH.test(r.title) || JOBISH.test(r.link) || JOBISH.test(r.snippet);
}
