import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { call, CvError, RULES } from "./resume";
import { LI_SUBSCORES, LI_LIMITS, type LinkedinAnalysis } from "./linkedin-shared";

/*
 * Perfil do LinkedIn: a pessoa manda o PDF que o próprio LinkedIn gera ("Salvar como PDF") ou cola o texto.
 * O robô não acessa o LinkedIn: o perfil exige login e os termos não permitem automação.
 */

const Out = z.object({
  is_profile: z.boolean(),
  text: z.string(),
  score: z.number(),
  label: z.string(),
  summary: z.string(),
  subscores: z.array(z.object({ key: z.enum(["headline", "about", "experience", "skills", "search"]), score: z.number(), comment: z.string() })),
  headlines: z.array(z.string()),
  about: z.string(),
  keywords_have: z.array(z.string()),
  keywords_missing: z.array(z.string()),
  skills: z.array(z.string()),
  suggestions: z.array(z.object({ section: z.string(), issue: z.string(), original: z.string(), suggestion: z.string(), why: z.string(), priority: z.enum(["alta", "média", "baixa"]) })),
  checklist: z.array(z.string()),
});

const SYSTEM = `Você é especialista em perfis do LinkedIn e em como recrutadores buscam candidatos no LinkedIn Recruiter, no mercado brasileiro. ${RULES.replace("que o currículo não sustente", "que o perfil não sustente")}
Se houver CARGO-ALVO, otimize tudo para ser encontrado e convencer recrutadores desse cargo; sem cargo-alvo, para o cargo atual.
Se o documento NÃO for um perfil do LinkedIn nem um currículo, devolva is_profile=false, textos vazios, números 0 e listas vazias.
- text: transcreva o perfil em texto simples (seções em linhas próprias), fiel ao original.
- score (0-100, exigente) e label ("Fraco", "Regular", "Bom", "Muito bom" ou "Excelente"); summary: 1-2 frases de diagnóstico.
- subscores: headline (título), about (Sobre), experience (experiências com resultados), skills (competências), search (o quanto aparece nas buscas pelas palavras certas), cada um 0-100 com comentário curto.
- headlines: exatamente 3 opções de título, cada uma com no máximo ${LI_LIMITS.headline} caracteres, com cargo, especialidade e palavras-chave (pode usar " | " como separador). Variar o estilo: direto, com proposta de valor, com área/setor.
- about: o "Sobre" reescrito em primeira pessoa, até ${LI_LIMITS.about} caracteres, com gancho na primeira linha (é o que aparece antes do "ver mais"), especialidades, 2-3 resultados reais e um fechamento; parágrafos curtos.
- keywords_have: até 10 palavras-chave do cargo que o perfil já tem; keywords_missing: até 10 que recrutadores buscam e faltam (só se o histórico permitir usá-las com honestidade).
- skills: as 5 competências que devem ficar em destaque, na ordem.
- suggestions: de 4 a 10 melhorias em experiências, formação, certificados, idiomas e destaques ("original" = trecho exato do texto, ou "" para acrescentar; "suggestion" pronto para colar no LinkedIn).
- checklist: até 6 itens para a pessoa conferir que o PDF não mostra (ex.: foto profissional, imagem de capa, URL personalizada, recomendações, "Aberto a trabalho" visível só para recrutadores, Destaques/Em destaque).`;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const clean = (xs: string[], max: number, len = 200) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].slice(0, max).map((x) => x.slice(0, len));

export async function analyzeLinkedin(content: Anthropic.Beta.BetaContentBlockParam[], target?: string): Promise<{ text: string; analysis: LinkedinAnalysis }> {
  const msg: Anthropic.Beta.BetaContentBlockParam[] = target?.trim() ? [...content, { type: "text", text: `CARGO-ALVO: ${target.trim().slice(0, 120)}` }] : content;
  const o = await call("linkedin", SYSTEM, msg, Out, "medium");
  if (!o.is_profile || o.text.trim().length < 80) throw new CvError("Isso não parece um perfil do LinkedIn. Use “Mais › Salvar como PDF” no seu perfil, ou cole o texto dele.");
  const text = o.text.trim().slice(0, 60_000);
  const byKey = new Map(o.subscores.map((s) => [s.key, s]));
  return {
    text,
    analysis: {
      score: clamp(o.score),
      label: o.label.trim().slice(0, 30) || "—",
      summary: o.summary.trim().slice(0, 400),
      subscores: LI_SUBSCORES.map(({ key }) => ({ key, score: clamp(byKey.get(key)?.score ?? 0), comment: (byKey.get(key)?.comment ?? "").trim().slice(0, 200) })),
      headlines: clean(o.headlines, 3, LI_LIMITS.headline),
      about: o.about.trim().slice(0, LI_LIMITS.about),
      keywords_have: clean(o.keywords_have, 10, 40),
      keywords_missing: clean(o.keywords_missing, 10, 40),
      skills: clean(o.skills, 5, 60),
      suggestions: o.suggestions.slice(0, 10).map((s, i) => ({
        id: `l${Date.now().toString(36)}${i}`,
        section: s.section.trim().slice(0, 40) || "Geral",
        issue: s.issue.trim().slice(0, 160),
        original: s.original.trim() && text.includes(s.original.trim()) ? s.original.trim() : "",
        suggestion: s.suggestion.trim().slice(0, 1500),
        why: s.why.trim().slice(0, 240),
        priority: s.priority,
        status: "open" as const,
      })).filter((s) => s.suggestion),
      checklist: clean(o.checklist, 6, 160),
    },
  };
}
