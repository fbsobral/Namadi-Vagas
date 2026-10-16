import "server-only";
import { randomUUID } from "node:crypto";
import { clearContacts, getJobById, insertContact, setContactsStatus } from "./db";
import { googleSearch, isDemoMode, type SerpResult } from "./serp";
import { demoContacts } from "./demo";
import type { ContactRole } from "./types";

const RECRUITER = /(recruit|talent|people|rh\b|recursos humanos|human resources|hr\b|sourcer|aquisi[cç][aã]o|recrutad|headhunter|gente e gest)/i;
const LEADER = /(head|diretor|director|vp\b|vice|chief|cto|cpo|ceo|coo|cmo|gerente|manager|l[ií]der|lead\b|coordenador|supervisor|founder|co-?fundador|sócio|principal)/i;

function classify(headline: string): ContactRole {
  if (RECRUITER.test(headline)) return "recruiter";
  if (LEADER.test(headline)) return "leader";
  return "peer";
}

function clean(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function parseProfile(r: SerpResult, company: string, titleWords: string[]) {
  if (!/linkedin\.com\/in\/[^/?#]+/i.test(r.link)) return null;
  const raw = clean(r.title.replace(/\s*[|\-–]\s*LinkedIn.*$/i, ""));
  const parts = raw.split(/\s+[-–—]\s+/);
  const name = clean(parts[0] ?? "");
  if (!name || name.length > 60 || /linkedin/i.test(name)) return null;
  const headline = clean(parts.slice(1).join(" · "));
  const blob = `${raw} ${r.snippet}`.toLowerCase();
  const c = company.toLowerCase();
  const companyMatch = c.length > 2 && blob.includes(c);
  if (!companyMatch) return null; // descarta homônimos de outras empresas
  const role = classify(headline || r.snippet.slice(0, 80));
  let score = 3;
  for (const w of titleWords) if (blob.includes(w)) score += 1;
  if (role === "recruiter") score += 2;
  if (role === "leader") score += 1;
  return { name, headline, snippet: clean(r.snippet).slice(0, 220), url: r.link.split("?")[0], role, score };
}

/**
 * Para uma vaga favorita, procura no Google perfis públicos do LinkedIn da empresa:
 * recrutadores, lideranças da área e pessoas do mesmo time.
 */
export async function findContacts(jobId: string) {
  const job = await getJobById(jobId);
  if (!job) return;

  try {
    const company = job.company.replace(/["]/g, "");
    const titleWords = job.title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3 && !/(pleno|s[eê]nior|junior|júnior|vaga|para|with|senior)/.test(w)).slice(0, 4);
    const core = titleWords.slice(0, 3).join(" ");

    const queries: [string, ContactRole][] = [
      [`site:linkedin.com/in "${company}" (recruiter OR "talent acquisition" OR recrutador OR recrutadora OR "people" OR "recursos humanos")`, "recruiter"],
      [`site:linkedin.com/in "${company}" ${core} (head OR diretor OR director OR gerente OR manager OR lead OR VP OR coordenador)`, "leader"],
      [`site:linkedin.com/in "${company}" ${core}`, "peer"],
    ];

    const batches: SerpResult[][] = isDemoMode()
      ? [demoContacts(company, job.title)]
      : await Promise.all(queries.map(([q]) => googleSearch(q, { num: 10 }).catch(() => [] as SerpResult[])));

    const byUrl = new Map<string, NonNullable<ReturnType<typeof parseProfile>>>();
    batches.flat().forEach((r) => {
      const p = parseProfile(r, company, titleWords);
      if (p && !byUrl.has(p.url)) byUrl.set(p.url, p);
    });

    const picked: NonNullable<ReturnType<typeof parseProfile>>[] = [];
    for (const role of ["recruiter", "leader", "peer"] as ContactRole[]) {
      picked.push(...[...byUrl.values()].filter((p) => p.role === role).sort((a, b) => b.score - a.score).slice(0, 4));
    }

    await clearContacts(jobId);
    for (const p of picked) await insertContact({ id: randomUUID(), job_id: jobId, user_id: job.user_id, ...p });
    await setContactsStatus(jobId, "done");
  } catch (e) {
    await setContactsStatus(jobId, "error", e instanceof Error ? e.message : String(e));
  }
}
