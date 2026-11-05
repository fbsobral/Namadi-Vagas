import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import mammoth from "mammoth";
import { CV_MAX_BYTES, CvError, cvConfigured } from "./cv";

/*
 * Módulo Currículo: pontuação, sugestões por seção, compatibilidade com uma vaga e carta de apresentação.
 * Diferente do "Preencher com meu currículo" (que descarta o arquivo), aqui a pessoa escolhe GUARDAR o texto
 * do currículo para poder aceitar sugestões e adaptar a cada vaga. O arquivo original nunca é guardado.
 */

const MODEL = process.env.AI_MODEL_RESUME || "claude-opus-5-5";
// o fallback do servidor reexecuta a mesma chamada em outro modelo se a primeira recusar por política
const BETAS: Anthropic.Beta.AnthropicBeta[] = ["server-side-fallback-2026-07-01"];

export { CV_MAX_BYTES, CvError, cvConfigured as resumeConfigured };

import { SUBSCORES, type JobFit, type ResumeAnalysis } from "./resume-shared";
export * from "./resume-shared";

/* ---------- schemas para a saída estruturada ---------- */

const AnalysisOut = z.object({
  is_cv: z.boolean(),
  text: z.string(),
  role: z.string(),
  score: z.number(),
  label: z.string(),
  summary: z.string(),
  subscores: z.array(z.object({ key: z.enum(["coverage", "structure", "clarity", "impact", "ats"]), score: z.number(), comment: z.string() })),
  strengths: z.array(z.string()),
  keywords: z.array(z.string()),
  suggestions: z.array(z.object({
    section: z.string(),
    issue: z.string(),
    original: z.string(),
    suggestion: z.string(),
    why: z.string(),
    priority: z.enum(["alta", "média", "baixa"]),
  })),
});

const FitOut = z.object({
  score: z.number(),
  verdict: z.string(),
  matched: z.array(z.string()),
  missing: z.array(z.string()),
  tips: z.array(z.string()),
  summary: z.string(),
  bullets: z.array(z.string()),
});

const LetterOut = z.object({ letter: z.string() });

/* ---------- prompts ---------- */

const RULES = `Responda sempre em português do Brasil. Fale com a pessoa em segunda pessoa ("você"). Nunca invente experiência, cargo, empresa, número, certificação ou habilidade que o currículo não sustente: quando faltar um dado (ex.: um resultado em números), sugira o formato e marque o lugar com colchetes, como [X%].`;

const ANALYZE = `Você é especialista em currículos e em sistemas de triagem (ATS) do mercado brasileiro. ${RULES}

Se o documento NÃO for um currículo, devolva is_cv=false, textos vazios, números 0 e listas vazias.

Se for um currículo:
- text: transcreva o currículo inteiro em texto simples, fiel ao original (mesmas palavras), uma seção por bloco, títulos de seção em linhas próprias e cada item de lista começando com "- ". Esse texto será editado aceitando suas sugestões, então os trechos "original" das sugestões precisam existir nele exatamente.
- role: cargo atual ou mais recente.
- score: nota de 0 a 100 do currículo como um todo (seja exigente: 90+ é raro). label: "Fraco", "Regular", "Bom", "Muito bom" ou "Excelente".
- summary: 1 ou 2 frases com o diagnóstico geral.
- subscores: as cinco chaves (coverage = abrangência do que deveria estar lá; structure = organização e seções; clarity = escrita objetiva; impact = resultados e números; ats = facilidade de leitura por sistemas e palavras-chave), cada uma com nota 0-100 e um comentário curto.
- strengths: até 4 pontos fortes reais.
- keywords: até 12 palavras-chave do perfil que recrutadores e ATS buscam para esse cargo e que o currículo já tem.
- suggestions: de 4 a 10 melhorias concretas, das mais importantes para as menos. Cada uma: section (nome da seção), issue (o problema, curto), original (trecho EXATO copiado de "text" que deve ser trocado — uma frase ou um item; use "" só quando a sugestão for acrescentar algo que não existe), suggestion (o texto novo, pronto para colar, mesmo idioma do currículo), why (por que melhora, uma frase), priority.`;

const FIT = `Você compara um currículo com uma vaga, como um recrutador experiente e um ATS fariam. ${RULES}
- score: compatibilidade de 0 a 100 (requisitos obrigatórios pesam mais; seja realista).
- verdict: uma frase direta sobre as chances e o principal motivo.
- matched: até 10 requisitos/palavras-chave da vaga que o currículo atende.
- missing: até 8 requisitos/palavras-chave da vaga que faltam ou não aparecem no currículo.
- tips: até 5 ajustes concretos para adaptar o currículo a ESTA vaga (sem inventar nada).
- summary: um resumo profissional de 3 a 4 linhas reescrito para esta vaga, só com o que o currículo sustenta.
- bullets: de 3 a 5 destaques de experiência reescritos com o vocabulário da vaga, prontos para colar.`;

const LETTER = `Você escreve cartas de apresentação curtas e humanas para candidaturas no Brasil. ${RULES}
Escreva em primeira pessoa, como a própria pessoa candidata, com 3 parágrafos curtos (no máximo 220 palavras): por que esta vaga e esta empresa, 2 ou 3 conquistas do currículo ligadas aos requisitos, e um fechamento com convite para conversar. Sem clichês ("venho por meio desta"), sem saudação genérica demais e sem assinatura inventada: termine com "[Seu nome]".`;

/* ---------- chamadas ---------- */

let client: Anthropic | null = null;
const ai = () => (client ??= new Anthropic({ timeout: 120_000, maxRetries: 1 }));

async function call<S extends z.ZodType>(system: string, content: Anthropic.Beta.BetaContentBlockParam[], schema: S, effort: "low" | "medium" | "high"): Promise<z.infer<S>> {
  if (!cvConfigured()) throw new CvError("A IA ainda não está configurada no servidor (ANTHROPIC_API_KEY).", 503);
  try {
    const res = await ai().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: "default",
      system,
      messages: [{ role: "user", content }],
      output_config: { format: betaZodOutputFormat(schema), effort },
    });
    if (res.stop_reason === "refusal") throw new CvError("A IA recusou processar esse conteúdo.", 422);
    if (res.stop_reason === "max_tokens") throw new CvError("O currículo é longo demais para analisar de uma vez.", 422);
    if (!res.parsed_output) throw new CvError("Não consegui interpretar a resposta da IA.", 502);
    return res.parsed_output as z.infer<S>;
  } catch (e) {
    if (e instanceof CvError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new CvError("A chave da Anthropic é inválida (ANTHROPIC_API_KEY).", 503);
    if (e instanceof Anthropic.RateLimitError) throw new CvError("Muitos pedidos à IA agora. Tente de novo em instantes.", 429);
    if (e instanceof Anthropic.APIError) throw new CvError(`Falha ao falar com a IA (${e.status}).`, 502);
    throw new CvError("Não consegui falar com a IA agora.", 502);
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const clean = (xs: string[], max: number, len = 160) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].slice(0, max).map((x) => x.slice(0, len));

function kind(name: string, mime: string): "pdf" | "docx" | "txt" | null {
  const n = name.toLowerCase();
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx") || mime.includes("wordprocessingml")) return "docx";
  if (n.endsWith(".txt") || n.endsWith(".md") || mime.startsWith("text/")) return "txt";
  return null;
}

/** Monta o conteúdo da mensagem a partir do arquivo enviado (PDF vai direto; DOCX/TXT viram texto). */
export async function fileContent(file: { name: string; type: string; buffer: Buffer }): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  const k = kind(file.name, file.type);
  if (!k) throw new CvError("Formato não suportado. Envie PDF, DOCX ou TXT.");
  if (file.buffer.length > CV_MAX_BYTES) throw new CvError("O arquivo passa de 5 MB.");
  if (k === "pdf") {
    if (!file.buffer.subarray(0, 5).toString().startsWith("%PDF")) throw new CvError("Esse arquivo não parece um PDF válido.");
    return [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.buffer.toString("base64") } },
      { type: "text", text: "Este é o currículo. Analise." },
    ];
  }
  const text = k === "docx" ? (await mammoth.extractRawText({ buffer: file.buffer })).value : file.buffer.toString("utf8");
  if (text.trim().length < 80) throw new CvError("Não consegui ler texto suficiente nesse arquivo.");
  if (text.length > 60_000) throw new CvError("Esse arquivo tem texto demais para um currículo.");
  return [{ type: "text", text: `Este é o currículo:\n\n${text}\n\nAnalise.` }];
}

const sid = (i: number) => `s${Date.now().toString(36)}${i}`;

/** Analisa um currículo (arquivo novo ou o texto já guardado). Devolve o texto normalizado e a análise. */
export async function analyzeResume(content: Anthropic.Beta.BetaContentBlockParam[]): Promise<{ text: string; analysis: ResumeAnalysis }> {
  const o = await call(ANALYZE, content, AnalysisOut, "medium");
  if (!o.is_cv || o.text.trim().length < 80) throw new CvError("Esse arquivo não parece um currículo.");
  const text = o.text.trim().slice(0, 60_000);
  const byKey = new Map(o.subscores.map((s) => [s.key, s]));
  return {
    text,
    analysis: {
      score: clamp(o.score),
      label: o.label.trim().slice(0, 30) || "—",
      summary: o.summary.trim().slice(0, 400),
      subscores: SUBSCORES.map(({ key }) => ({ key, score: clamp(byKey.get(key)?.score ?? 0), comment: (byKey.get(key)?.comment ?? "").trim().slice(0, 200) })),
      strengths: clean(o.strengths, 4, 200),
      keywords: clean(o.keywords, 12, 40),
      role: o.role.trim().slice(0, 80),
      suggestions: o.suggestions.slice(0, 10).map((s, i) => ({
        id: sid(i),
        section: s.section.trim().slice(0, 40) || "Geral",
        issue: s.issue.trim().slice(0, 160),
        // só vale como troca se o trecho existir de fato no texto; senão vira "acrescentar"
        original: s.original.trim() && text.includes(s.original.trim()) ? s.original.trim() : "",
        suggestion: s.suggestion.trim().slice(0, 1200),
        why: s.why.trim().slice(0, 240),
        priority: s.priority,
        status: "open" as const,
      })).filter((s) => s.suggestion),
    },
  };
}

export const analyzeText = (text: string) => analyzeResume([{ type: "text", text: `Este é o currículo:\n\n${text}\n\nAnalise.` }]);

type JobInput = { title: string; company: string; location: string | null; description: string };
const jobBlock = (j: JobInput) => `VAGA: ${j.title} — ${j.company}${j.location ? ` (${j.location})` : ""}\n\n${j.description.slice(0, 20_000)}`;

export async function fitJob(resumeText: string, job: JobInput): Promise<JobFit> {
  const o = await call(FIT, [{ type: "text", text: `CURRÍCULO:\n\n${resumeText}\n\n---\n\n${jobBlock(job)}` }], FitOut, "medium");
  return {
    score: clamp(o.score),
    verdict: o.verdict.trim().slice(0, 300),
    matched: clean(o.matched, 10, 60),
    missing: clean(o.missing, 8, 60),
    tips: clean(o.tips, 5, 300),
    summary: o.summary.trim().slice(0, 900),
    bullets: clean(o.bullets, 5, 400),
  };
}

export async function coverLetter(resumeText: string, job: JobInput): Promise<string> {
  const o = await call(LETTER, [{ type: "text", text: `CURRÍCULO:\n\n${resumeText}\n\n---\n\n${jobBlock(job)}` }], LetterOut, "medium");
  const letter = o.letter.trim();
  if (letter.length < 200) throw new CvError("Não consegui escrever a carta agora.", 502);
  return letter.slice(0, 4000);
}
