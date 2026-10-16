// Modelo de busca com termos, grupos e operadores E/OU (client-safe).
export type Op = "AND" | "OR";
export type Group = { op: Op; terms: string[] };
export type QuerySpec = {
  groups: Group[]; // cada grupo junta seus termos com `op`
  between: Op; // operador entre os grupos
  exclude: string[]; // termos que NÃO podem aparecer
};

export const emptySpec = (): QuerySpec => ({ groups: [{ op: "OR", terms: [] }], between: "AND", exclude: [] });

const term = (t: string) => {
  const s = t.trim().replace(/^-+/, "");
  if (!s) return "";
  if (/^".*"$/.test(s)) return s;
  return /\s/.test(s) ? `"${s.replace(/"/g, "")}"` : s; // termo com espaço vira frase exata
};

/** Ex.: { groups:[{OR:[X,Y,Z]},{AND:[a]}], between:AND }  →  (X OR Y OR Z) a */
export function specToQuery(spec: QuerySpec): string {
  const groups = spec.groups
    .map((g) => ({ op: g.op, terms: g.terms.map(term).filter(Boolean) }))
    .filter((g) => g.terms.length);

  const parts = groups.map((g) => {
    if (g.terms.length === 1) return g.terms[0];
    const joined = g.terms.join(g.op === "OR" ? " OR " : " ");
    const wrap = g.op === "OR" || spec.between === "OR" || groups.length > 1;
    return wrap ? `(${joined})` : joined;
  });

  const main = parts.join(spec.between === "OR" ? " OR " : " ");
  const ex = spec.exclude.map(term).filter(Boolean).map((t) => `-${t}`);
  return [main, ...ex].join(" ").trim();
}

export const hasTerms = (spec: QuerySpec) => spec.groups.some((g) => g.terms.some((t) => t.trim()));

/** Busca antiga (texto livre) → um grupo E com cada palavra, equivalente ao comportamento anterior. */
export function specFromLegacy(query: string): QuerySpec {
  return { groups: [{ op: "AND", terms: query.split(/\s+/).filter(Boolean) }], between: "AND", exclude: [] };
}

export function parseSpec(json: string | null | undefined, legacyQuery: string): QuerySpec {
  if (json) {
    try {
      const s = JSON.parse(json) as QuerySpec;
      if (Array.isArray(s.groups)) return { groups: s.groups, between: s.between === "OR" ? "OR" : "AND", exclude: s.exclude ?? [] };
    } catch { /* cai no legado */ }
  }
  return specFromLegacy(legacyQuery);
}

/** Valida/limpa no servidor. */
export function cleanSpec(spec: QuerySpec): QuerySpec {
  const clean = (arr: string[], max: number) => [...new Set(arr.map((t) => String(t).trim().slice(0, 60)).filter(Boolean))].slice(0, max);
  return {
    groups: (spec.groups ?? []).slice(0, 6).map((g): Group => ({ op: g.op === "AND" ? "AND" : "OR", terms: clean(g.terms ?? [], 12) })).filter((g) => g.terms.length),
    between: spec.between === "OR" ? "OR" : "AND",
    exclude: clean(spec.exclude ?? [], 10),
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
  const not = spec.exclude.map(quoteB).filter(Boolean).map((t) => `NOT ${t}`);
  return [main, ...not].join(" ").trim();
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const has = (text: string, term: string) => {
  const t = norm(term.trim().replace(/^"|"$/g, ""));
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text);
};

/** Avalia a busca (E/OU/exclusões) contra um texto, ignorando acentos e maiúsculas. */
export function matchSpec(spec: QuerySpec, rawText: string): boolean {
  const text = norm(rawText);
  const groups = spec.groups.filter((g) => g.terms.some((t) => t.trim()));
  if (spec.exclude.some((t) => has(text, t))) return false;
  if (!groups.length) return true;
  const ok = groups.map((g) => (g.op === "OR" ? g.terms.some((t) => has(text, t)) : g.terms.every((t) => has(text, t))));
  return spec.between === "OR" ? ok.some(Boolean) : ok.every(Boolean);
}

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

/** True se o texto contém algum termo excluído. */
export const hitsExclusion = (spec: QuerySpec, text: string) => !matchSpec({ groups: [], between: "AND", exclude: spec.exclude }, text);
