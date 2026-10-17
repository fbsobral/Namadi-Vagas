import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import mammoth from "mammoth";
import { cleanSpec, type QuerySpec } from "./query";

export const CV_MAX_BYTES = 5 * 1024 * 1024;
const MODEL = process.env.AI_MODEL_CV || "claude-sonnet-5-5";

/* O CV é lido na hora e descartado: nada do arquivo nem do texto é gravado. */

const Group = z.object({ op: z.enum(["AND", "OR"]), terms: z.array(z.string()), scope: z.enum(["any", "title"]) });
const Suggestion = z.object({
  name: z.string(),
  groups: z.array(Group),
  between: z.enum(["AND", "OR"]),
  exclude: z.array(z.string()),
  excludeBody: z.array(z.string()),
  location: z.string(),
  recency: z.enum(["day", "week", "month", "any"]),
  why: z.string(),
});
const Analysis = z.object({
  is_cv: z.boolean(),
  profile: z.object({
    current_role: z.string(),
    seniority: z.string(),
    years: z.number(),
    skills: z.array(z.string()),
    city: z.string(),
    languages: z.array(z.string()),
  }),
  searches: z.array(Suggestion),
});

const SYSTEM = `Você configura buscas de vagas de emprego a partir de currículos. Responda SEMPRE em português do Brasil.

Se o documento NÃO for um currículo, devolva is_cv=false, campos de texto vazios, listas vazias e searches vazio.

Se for um currículo, monte buscas que encontrem vagas ADEQUADAS a esta pessoa agora. Use só o que o currículo sustenta — nunca invente experiência, cargo ou habilidade.

Regras de cada busca (o formato é: grupos de palavras; cada grupo junta seus termos com E ou OU; os grupos se juntam por "between"):
- Grupo 1 (op OR, scope any): títulos de cargo-alvo e sinônimos reais, em português E em inglês quando fizer sentido (ex.: "Product Designer", "Designer de Produto"). Termos curtos (até 3 palavras).
- Grupo 2 (op OR, scope title): marcadores de senioridade compatíveis com o nível atual (ex.: "sênior", "senior", "sr"). Omita o grupo se a senioridade não estiver clara.
- between = AND.
- exclude (termos que não podem aparecer NO TÍTULO): níveis claramente abaixo do dela(e) (ex.: "estágio", "trainee", "júnior") — só se a pessoa for pleno ou acima. Pode ficar vazio.
- excludeBody: deixe vazio, a menos que o currículo deixe explícito algo que a pessoa NÃO quer (ex.: "somente remoto" -> não use isso aqui, use location).
- location: a cidade do currículo; "remoto" se o currículo indicar preferência remota; vazio se não souber.
- recency: use "week".
- name: nome curto para a busca (ex.: "Product Designer sênior").
- why: UMA frase explicando a escolha, citando o que viu no currículo.

searches: a primeira é a principal. Se (e somente se) o currículo sustentar, acrescente até 2 variações (cargos adjacentes realistas, ou outro nível). Não force variações.

profile: cargo atual (ou o mais recente), senioridade (júnior/pleno/sênior/liderança), anos de experiência (número, estimado pelas datas), até 12 habilidades principais, cidade e idiomas.`;

export type CvSuggestion = {
  name: string;
  spec: QuerySpec;
  location: string;
  recency: "day" | "week" | "month" | "any";
  why: string;
};
export type CvAnalysis = {
  profile: { role: string; seniority: string; years: number; skills: string[]; city: string; languages: string[] };
  searches: CvSuggestion[];
};

export class CvError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const cvConfigured = () => !!process.env.ANTHROPIC_API_KEY;

function kind(name: string, mime: string): "pdf" | "docx" | "txt" | null {
  const n = name.toLowerCase();
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx") || mime.includes("wordprocessingml")) return "docx";
  if (n.endsWith(".txt") || n.endsWith(".md") || mime.startsWith("text/")) return "txt";
  return null;
}

export async function analyzeCv(file: { name: string; type: string; buffer: Buffer }): Promise<CvAnalysis> {
  if (!cvConfigured()) throw new CvError("A leitura de CV ainda não está configurada no servidor (ANTHROPIC_API_KEY).", 503);
  const k = kind(file.name, file.type);
  if (!k) throw new CvError("Formato não suportado. Envie PDF, DOCX ou TXT.");
  if (file.buffer.length > CV_MAX_BYTES) throw new CvError("O arquivo passa de 5 MB.");
  if (k === "pdf" && !file.buffer.subarray(0, 5).toString().startsWith("%PDF")) throw new CvError("Esse arquivo não parece um PDF válido.");

  // PDF: o Claude lê direto (inclusive layouts em colunas). DOCX/TXT: viram texto.
  let content: Anthropic.MessageParam["content"];
  if (k === "pdf") {
    content = [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.buffer.toString("base64") } },
      { type: "text", text: "Este é o currículo. Configure as buscas." },
    ];
  } else {
    const text = k === "docx" ? (await mammoth.extractRawText({ buffer: file.buffer })).value : file.buffer.toString("utf8");
    if (text.trim().length < 80) throw new CvError("Não consegui ler texto suficiente nesse arquivo.");
    content = [{ type: "text", text: `Este é o currículo:\n\n${text.slice(0, 40_000)}\n\nConfigure as buscas.` }];
  }

  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  let parsed: z.infer<typeof Analysis> | null;
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 12000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(Analysis), effort: "medium" },
    });
    if (res.stop_reason === "refusal") throw new CvError("O modelo recusou ler esse documento.");
    parsed = res.parsed_output;
  } catch (e) {
    if (e instanceof CvError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new CvError("A chave da Anthropic é inválida (ANTHROPIC_API_KEY).", 503);
    if (e instanceof Anthropic.RateLimitError) throw new CvError("Muitas leituras ao mesmo tempo. Tente de novo em instantes.", 429);
    if (e instanceof Anthropic.APIError) throw new CvError(`Falha ao falar com a Anthropic (${e.status}).`, 502);
    throw new CvError("Não consegui ler o currículo agora.", 502);
  }
  if (!parsed) throw new CvError("Não consegui interpretar o currículo.", 422);
  if (!parsed.is_cv || !parsed.searches.length) throw new CvError("Esse arquivo não parece um currículo.");

  const searches = parsed.searches.slice(0, 3).flatMap((s): CvSuggestion[] => {
    const spec = cleanSpec({ groups: s.groups, between: s.between, exclude: s.exclude, excludeBody: s.excludeBody });
    if (!spec.groups.length) return [];
    return [{ name: s.name.trim().slice(0, 80), spec, location: s.location.trim().slice(0, 80), recency: s.recency, why: s.why.trim().slice(0, 300) }];
  });
  if (!searches.length) throw new CvError("Não consegui montar uma busca a partir desse currículo.", 422);

  const p = parsed.profile;
  return {
    profile: {
      role: p.current_role.slice(0, 80),
      seniority: p.seniority.slice(0, 40),
      years: Math.max(0, Math.min(60, Math.round(p.years))),
      skills: [...new Set(p.skills.map((x) => x.trim()).filter(Boolean))].slice(0, 12),
      city: p.city.slice(0, 60),
      languages: p.languages.slice(0, 5),
    },
    searches,
  };
}
