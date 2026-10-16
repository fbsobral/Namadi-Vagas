import "server-only";
import type { SerpResult } from "./serp";

// Dados FICTÍCIOS usados apenas quando não há SERPER_API_KEY, para você ver o app funcionando.
const COMPANIES = ["Nubank", "iFood", "Stone", "QuintoAndar", "Mercado Livre", "Creditas", "VTEX", "Hotmart", "Loft", "Gupy", "Dock", "Ambev Tech"];
const LEVELS = ["Pleno", "Sênior", "Júnior", "Staff", "Lead"];
const WHERE = ["São Paulo, SP", "Remoto — Brasil", "Belo Horizonte, MG", "Curitiba, PR", "Híbrido — Rio de Janeiro"];

export function demoJobs(query: string, location: string): SerpResult[] {
  const base = query.replace(/\(.*?\)|site:\S+|\bOR\b|"/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 4).join(" ") || "Product Designer";
  const seed = Math.floor(Date.now() / 60000);
  return Array.from({ length: 8 }, (_, i) => {
    const c = COMPANIES[(seed + i * 5) % COMPANIES.length];
    const lvl = LEVELS[(seed + i) % LEVELS.length];
    const w = location || WHERE[(seed + i) % WHERE.length];
    return {
      title: `${c} hiring ${base} ${lvl} in ${w} | LinkedIn`,
      link: `https://www.linkedin.com/jobs/view/demo-${c.toLowerCase().replace(/\W/g, "")}-${seed % 1000}-${i}`,
      snippet: `${c} está em busca de ${base} ${lvl} para integrar o time. Trabalhe com squads multidisciplinares, impacto direto em milhões de usuários, benefícios flexíveis e cultura de autonomia. (dado de demonstração)`,
    };
  });
}

const NAMES = ["Marina Alves", "Rafael Costa", "Juliana Prado", "Thiago Ribeiro", "Camila Duarte", "Bruno Nogueira", "Fernanda Lima", "Lucas Martins", "Patrícia Souza"];
export function demoContacts(company: string, title: string) {
  const heads = [
    [`Talent Acquisition Partner`, "recruiter"],
    [`Tech Recruiter`, "recruiter"],
    [`Head of People`, "recruiter"],
    [`Head de Produto`, "leader"],
    [`Engineering Manager`, "leader"],
    [`Diretor(a) de Design`, "leader"],
    [`${title.split(" ").slice(0, 2).join(" ")} Sr.`, "peer"],
    [`Staff ${title.split(" ").slice(0, 2).join(" ")}`, "peer"],
    [`Senior ${title.split(" ").slice(0, 2).join(" ")}`, "peer"],
  ] as const;
  return heads.map(([h], i) => ({
    title: `${NAMES[i]} - ${h} - ${company} | LinkedIn`,
    link: `https://www.linkedin.com/in/demo-${NAMES[i].toLowerCase().replace(/\W+/g, "-")}`,
    snippet: `${h} na ${company}. Brasil · 500+ conexões. (perfil de demonstração)`,
  }));
}
