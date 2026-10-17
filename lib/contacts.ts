import "server-only";
import { randomUUID } from "node:crypto";
import { clearContacts, getJobById, getKv, insertContact, setContactsStatus, setKv } from "./db";
import { googleSearch, isDemoMode, type SerpResult } from "./serp";
import { demoContacts } from "./demo";
import type { ContactRole } from "./types";

/* ------------------------------ texto e regras ------------------------------ */

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, term: string) => !!term && new RegExp(`(^|[^a-z0-9])${esc(term)}([^a-z0-9]|$)`).test(text);

// Sobre texto normalizado (sem acento, minúsculo)
const HR = /recruit|recrutad|recrutament|talent|sourcer|headhunter|selecao|\brh\b|recursos humanos|human resources|\bhr\b|hrbp|people (partner|operations|ops|&|and|business)|gente (e|&) gestao/;
const LEADER = /\bhead\b|diretor|director|\bvp\b|vice|chief|\bc[a-z]o\b|gerente|manager|lider|\blead\b|coordenador|supervisor|founder|co-?fundador|socio|principal/;

const AREAS: Record<string, { label: string; re: RegExp }> = {
  design: { label: "Design", re: /design|\bux\b|\bui\b|criativ|creative/ },
  produto: { label: "Produto", re: /\bproduct\b|\bproduto\b|\bpm\b|\bcpo\b|product manager/ },
  marketing: { label: "Marketing", re: /marketing|growth|\bbrand\b|marca|conteudo|content|comunicacao|social media|\bmidia\b|\bseo\b|performance|\bcrm\b|\bcmo\b|branding|inbound/ },
  engenharia: { label: "Engenharia/Tecnologia", re: /engenh|engineer|develop|desenvolv|software|backend|frontend|full ?stack|devops|\bsre\b|tech lead|\bcto\b|\bqa\b|mobile|programad/ },
  dados: { label: "Dados", re: /\bdados\b|\bdata\b|analytics|\bbi\b|machine learning|\bia\b|\bai\b|cientista/ },
  vendas: { label: "Vendas/Comercial", re: /vendas|\bsales\b|comercial|business development|\bsdr\b|\bbdr\b|customer success|sucesso do cliente|account executive/ },
  financeiro: { label: "Financeiro", re: /financ|finance|controller|contab|tesouraria|fp&a/ },
  juridico: { label: "Jurídico", re: /juridic|\blegal\b|advogad|compliance/ },
  operacoes: { label: "Operações", re: /operacoes|operations|logistic|supply|processos/ },
};

/** Áreas detectadas em um texto, da mais para a menos presente (máx. 2). */
function detectAreas(text: string): string[] {
  const t = norm(text);
  return Object.entries(AREAS)
    .map(([k, a]) => [k, (t.match(new RegExp(a.re.source, "g")) ?? []).length] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
}

const LEVEL_WORDS = /^(pleno|senior|junior|sr|jr|vaga|para|with|the|and|de|da|do|em|na|no|analista|assistente|especialista|specialist|analyst)$/;
function titleWords(title: string) {
  return norm(title).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !LEVEL_WORDS.test(w)).slice(0, 5);
}

function cleanCompany(raw: string) {
  return clean(raw.replace(/[®™"()]/g, " ").replace(/\b(s\.?\s?a\.?|ltda\.?|inc\.?|eireli|me)\b\.?/gi, " "));
}

/* ------------------------------ leitura do resultado ------------------------------ */

type Profile = { name: string; headline: string; meta: string; url: string; blob: string; head: string; snippet: string };

/** Lê um resultado do Google para um perfil do LinkedIn, usando título E todas as linhas do resultado. */
export function parseProfile(r: SerpResult): Profile | null {
  if (!/linkedin\.com\/in\/[^/?#]+/i.test(r.link)) return null;
  const title = clean(r.title.replace(/\s*[|\-–]\s*LinkedIn.*$/i, ""));
  const parts = title.split(/\s+[-–—]\s+/);
  const name = clean(parts[0] ?? "");
  if (!name || name.length > 60 || /linkedin/i.test(name)) return null;

  const lines = r.lines?.length ? r.lines : [r.snippet];
  // linha "Cidade · Cargo · Empresa" — a mais informativa do resultado
  const metaLine = lines.find((l) => (l.match(/·/g) ?? []).length >= 2 && !/followers|seguidores/i.test(l)) ?? "";
  const segs = metaLine.split("·").map((s) => clean(s)).filter(Boolean);
  const headline = (segs.length >= 3 ? segs[1] : clean(parts.slice(1).join(" · "))) || clean(parts.slice(1).join(" · "));

  return {
    name,
    headline,
    meta: metaLine,
    url: r.link.split("?")[0],
    blob: norm(`${title} ${lines.join(" ")} ${r.snippet}`),
    head: norm(`${title} ${metaLine}`), // só título e linha "cidade · cargo · empresa"
    snippet: clean(metaLine || r.snippet).slice(0, 220),
  };
}

export type Evaluated = {
  pool: number; // perfis que citam a empresa
  picked: { name: string; headline: string; snippet: string; url: string; role: ContactRole; score: number }[];
  areas: string[];
};

/** Passo 1: fica quem cita a empresa. Passo 2: fica quem é de RH/Recrutamento ou da mesma área da vaga. */
export function evaluate(results: SerpResult[], company: string, jobTitle: string): Evaluated {
  const co = norm(cleanCompany(company));
  const areas = detectAreas(jobTitle);
  const words = titleWords(jobTitle);

  // A empresa costuma estar no título/cargo do perfil. Menção solta no texto ("sobre") só entra se faltar gente.
  const all = new Map<string, Profile>();
  for (const r of results) {
    const p = parseProfile(r);
    if (p && !all.has(p.url)) all.set(p.url, p);
  }
  const strong = [...all.values()].filter((p) => has(p.head, co));
  const weak = [...all.values()].filter((p) => !has(p.head, co) && has(p.blob, co));
  const pool = new Map<string, Profile>((strong.length >= 3 ? strong : [...strong, ...weak]).map((p) => [p.url, p]));

  const scored = [...pool.values()].flatMap((p) => {
    const head = norm(`${p.headline} ${p.name} ${p.meta}`); // cargo/área, sem o texto longo do "sobre"
    const isHR = HR.test(head);
    const profAreas = detectAreas(head);
    const sameArea = areas.some((a) => profAreas.includes(a)) || words.some((w) => has(head, w));
    if (!isHR && !sameArea) return []; // outra área: não interessa
    const role: ContactRole = isHR ? "recruiter" : LEADER.test(head) ? "leader" : "peer";
    let score = 2 + (isHR ? 3 : 0) + (sameArea ? 2 : 0) + (role === "leader" ? 1 : 0);
    for (const w of words) if (has(head, w)) score += 1;
    return [{ name: p.name, headline: p.headline, snippet: p.snippet, url: p.url, role, score }];
  });

  const picked: Evaluated["picked"] = [];
  for (const role of ["recruiter", "leader", "peer"] as ContactRole[]) {
    picked.push(...scored.filter((p) => p.role === role).sort((a, b) => b.score - a.score).slice(0, 4));
  }
  return { pool: pool.size, picked, areas };
}

/* ------------------------------ busca ------------------------------ */

const POOL_TTL = 7 * 86_400_000;
type Raw = { title: string; link: string; snippet: string; lines?: string[] };

const g = (q: string, page = 1) => googleSearch(q, { page, engines: ["google"] });

function friendly(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (/captcha|pausa/i.test(m)) return "O Google bloqueou a consulta (CAPTCHA). Tente de novo em cerca de 30 minutos.";
  return m;
}

/**
 * Para uma vaga favorita: 1) junta os perfis públicos do LinkedIn que citam a empresa (Google),
 * 2) filtra para ficar só RH/Recrutamento e gente da mesma área da vaga.
 */
export async function findContacts(jobId: string) {
  const job = await getJobById(jobId);
  if (!job) return;

  try {
    const company = cleanCompany(job.company);
    if (company.length < 2 || /^empresa$/i.test(company)) throw new Error("Não consegui identificar o nome da empresa desta vaga.");

    let raw: Raw[];
    if (isDemoMode()) {
      raw = demoContacts(company, job.title);
    } else {
      const key = `pool2:${norm(company)}`;
      const cached = await getKv(key);
      raw = cached && Date.now() - cached.updated_at < POOL_TTL ? (JSON.parse(cached.value) as Raw[]) : [];

      if (!raw.length) {
        // até 3 páginas de "todos os perfis que citam a empresa"
        for (let page = 1; page <= 2; page++) {
          const r = await g(`site:linkedin.com/in intitle:"${company}"`, page).catch((e) => { if (page === 1) throw e; return [] as Raw[]; });
          raw = raw.concat(r);
          if (r.length < 6) break;
        }
      }

      let result = evaluate(raw, company, job.title);
      // pouco aproveitável? busca dirigida (RH e área), no máximo 2 consultas extras
      if (result.picked.length < 6) {
        const areaWords = result.areas.length ? ` (${result.areas.map((a) => AREAS[a].label.split("/")[0]).join(" OR ")})` : "";
        const extra = [
          `site:linkedin.com/in intitle:"${company}" (recrutador OR recruiter OR "talent acquisition" OR "recursos humanos" OR "people")`,
          `site:linkedin.com/in intitle:"${company}"${areaWords || ` ${titleWords(job.title).slice(0, 2).join(" ")}`}`,
        ];
        for (const q of extra) {
          const r = await g(q).catch(() => [] as Raw[]);
          const seen = new Set(raw.map((x) => x.link));
          raw = raw.concat(r.filter((x) => !seen.has(x.link)));
        }
        result = evaluate(raw, company, job.title);
      }
      if (raw.length) await setKv(key, JSON.stringify(raw.slice(0, 80)));
    }

    const result = evaluate(raw, company, job.title);
    await clearContacts(jobId);
    for (const p of result.picked) await insertContact({ id: randomUUID(), job_id: jobId, user_id: job.user_id, ...p });

    const area = result.areas.length ? result.areas.map((a) => AREAS[a].label).join(" / ") : null;
    const note = result.pool
      ? `Achei ${result.pool} perfis que citam ${company}; mostrando ${result.picked.length} do RH${area ? ` ou da área de ${area}` : " ou da mesma área"}.`
      : `O Google não retornou perfis que citem ${company}.`;
    await setContactsStatus(jobId, "done", null, note);
  } catch (e) {
    await setContactsStatus(jobId, "error", friendly(e));
  }
}
