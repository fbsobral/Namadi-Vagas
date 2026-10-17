// Modelo de busca com termos, grupos e operadores E/OU (client-safe).
export type Op = "AND" | "OR";
export type Scope = "any" | "title"; // onde procurar: título e descrição (padrão) ou só no título
export type Group = { op: Op; terms: string[]; scope?: Scope };
export type QuerySpec = {
  groups: Group[]; // cada grupo junta seus termos com `op`
  between: Op; // operador entre os grupos
  exclude: string[]; // termos que NÃO podem aparecer no TÍTULO
  excludeBody?: string[]; // termos que NÃO podem aparecer no título nem na DESCRIÇÃO
};

export const emptySpec = (): QuerySpec => ({ groups: [{ op: "OR", terms: [], scope: "any" }], between: "AND", exclude: [], excludeBody: [] });

const term = (t: string) => {
  const s = t.trim().replace(/^-+/, "");
  if (!s) return "";
  if (/^".*"$/.test(s)) return s;
  return /\s/.test(s) ? `"${s.replace(/"/g, "")}"` : s; // termo com espaço vira frase exata
};
const inTitle = (t: string) => (t ? `intitle:${t}` : "");

/** Ex.: { groups:[{OR:[X,Y,Z]},{AND:[a]}], between:AND }  →  (X OR Y OR Z) a */
export function specToQuery(spec: QuerySpec): string {
  const groups = spec.groups
    .map((g) => ({ op: g.op, terms: g.terms.map(term).filter(Boolean).map((t) => (g.scope === "title" ? inTitle(t) : t)) }))
    .filter((g) => g.terms.length);

  const parts = groups.map((g) => {
    if (g.terms.length === 1) return g.terms[0];
    const joined = g.terms.join(g.op === "OR" ? " OR " : " ");
    const wrap = g.op === "OR" || spec.between === "OR" || groups.length > 1;
    return wrap ? `(${joined})` : joined;
  });

  const main = parts.join(spec.between === "OR" ? " OR " : " ");
  const ex = spec.exclude.map(term).filter(Boolean).map((t) => `-intitle:${t}`);
  const exBody = (spec.excludeBody ?? []).map(term).filter(Boolean).map((t) => `-${t}`);
  return [main, ...ex, ...exBody].join(" ").trim();
}

export const hasTerms = (spec: QuerySpec) => spec.groups.some((g) => g.terms.some((t) => t.trim()));

/** Busca antiga (texto livre) → um grupo E com cada palavra, equivalente ao comportamento anterior. */
export function specFromLegacy(query: string): QuerySpec {
  return { groups: [{ op: "AND", terms: query.split(/\s+/).filter(Boolean) }], between: "AND", exclude: [], excludeBody: [] };
}

export function parseSpec(json: string | null | undefined, legacyQuery: string): QuerySpec {
  if (json) {
    try {
      const s = JSON.parse(json) as QuerySpec;
      if (Array.isArray(s.groups)) return { groups: s.groups, between: s.between === "OR" ? "OR" : "AND", exclude: s.exclude ?? [], excludeBody: s.excludeBody ?? [] };
    } catch { /* cai no legado */ }
  }
  return specFromLegacy(legacyQuery);
}

/** Valida/limpa no servidor. */
export function cleanSpec(spec: QuerySpec): QuerySpec {
  const clean = (arr: string[], max: number) => [...new Set(arr.map((t) => String(t).trim().slice(0, 60)).filter(Boolean))].slice(0, max);
  return {
    groups: (spec.groups ?? []).slice(0, 6).map((g): Group => ({ op: g.op === "AND" ? "AND" : "OR", terms: clean(g.terms ?? [], 12), scope: g.scope === "title" ? "title" : "any" })).filter((g) => g.terms.length),
    between: spec.between === "OR" ? "OR" : "AND",
    exclude: clean(spec.exclude ?? [], 10),
    excludeBody: clean(spec.excludeBody ?? [], 10),
  };
}

/* ---------- usos por fontes diretas (LinkedIn / Gupy) ---------- */

const quoteB = (t: string) => {
  const s = t.trim().replace(/^-+/, "").replace(/"/g, "");
  return /\s/.test(s) ? `"${s}"` : s;
};

/** Sintaxe booleana do LinkedIn: ("a" OR b) AND c NOT x */
export function specToBoolean(spec: QuerySpec): string {
  const groups = spec.groups.map((g) => ({ op: g.op, terms: g.terms.map(quoteB).filter(Boolean) })).filter((g) => g.terms.length);
  const parts = groups.map((g) => (g.terms.length === 1 ? g.terms[0] : `(${g.terms.join(` ${g.op} `)})`));
  const main = parts.join(` ${spec.between} `);
  // Exclusões só do título são aplicadas aqui no robô; só as "também na descrição" vão como NOT para o LinkedIn.
  const not = (spec.excludeBody ?? []).map(quoteB).filter(Boolean).map((t) => `NOT ${t}`);
  return [main, ...not].join(" ").trim();
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const has = (text: string, term: string) => {
  const t = norm(term.trim().replace(/^"|"$/g, ""));
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text);
};

export type Verdict = { verdict: "keep" | "drop" | "filtered"; reason?: string };

/**
 * Avalia a busca contra uma vaga, respeitando "onde procurar" de cada grupo.
 *  - drop: não bate com a busca (ou termo excluído no título) — nem entra na lista;
 *  - filtered: bate, mas um termo "excluir também na descrição" apareceu — vai para "Filtradas", sem apagar;
 *  - trustAny: a fonte (LinkedIn) já procurou no corpo; sem descrição em mãos, grupos "título ou descrição" são aceitos.
 */
export function evaluateJob(spec: QuerySpec, job: { title: string; text?: string | null }, opts: { trustAny?: boolean } = {}): Verdict {
  const t = norm(job.title);
  const x = job.text != null ? norm(`${job.title} ${job.text}`) : null;

  if (spec.exclude.some((e) => has(t, e))) return { verdict: "drop", reason: "termo excluído no título" };

  const groups = spec.groups.filter((g) => g.terms.some((term) => term.trim()));
  if (groups.length) {
    const ok = groups.map((g) => {
      const hay = g.scope === "title" ? t : x ?? (opts.trustAny ? null : t);
      if (hay === null) return true; // fonte já vetou no corpo
      return g.op === "OR" ? g.terms.some((term) => has(hay, term)) : g.terms.every((term) => has(hay, term));
    });
    if (!(spec.between === "OR" ? ok.some(Boolean) : ok.every(Boolean))) return { verdict: "drop", reason: "não bate com as palavras-chave" };
  }

  const hit = (spec.excludeBody ?? []).find((e) => has(x ?? t, e));
  if (hit) return { verdict: "filtered", reason: `${x ? "a descrição cita" : "o título cita"} “${hit}”` };
  return { verdict: "keep" };
}

/** Termos "positivos" da busca, para destacar no texto da vaga. */
export const includeTerms = (spec: QuerySpec) => [...new Set(spec.groups.flatMap((g) => g.terms.map((t) => t.trim().replace(/^"|"$/g, "")).filter(Boolean)))];

/**
 * Termos para consultar APIs que só aceitam texto simples; o resultado é filtrado depois com matchSpec.
 * Com E entre grupos, combina os termos dos dois primeiros grupos (ex.: "marketing sênior", "marketing especialista").
 */
export function driverTerms(spec: QuerySpec, max = 6): string[] {
  const groups = spec.groups.filter((g) => g.terms.some((t) => t.trim()));
  const pick = (g: Group) => (g.op === "OR" ? g.terms : [g.terms.join(" ")]).map((t) => t.trim().replace(/^"|"$/g, "")).filter(Boolean);
  let out: string[];
  if (spec.between === "OR") out = groups.flatMap(pick);
  else if (groups.length >= 2) out = pick(groups[0]).flatMap((a) => pick(groups[1]).map((b) => `${a} ${b}`)).concat(pick(groups[0]));
  else out = groups.length ? pick(groups[0]) : [];
  return [...new Set(out)].slice(0, max);
}
