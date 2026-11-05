import { getUserId } from "@/lib/auth";
import { CV_MAX_BYTES, CvError, fileContent } from "@/lib/resume";
import { analyzeLinkedin } from "@/lib/linkedin";
import { rateLimit, saveLinkedin } from "@/lib/db";
import { getAiConfig } from "@/lib/ai-config";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** Recebe o perfil do LinkedIn (PDF do "Salvar como PDF", DOCX/TXT, ou texto colado) e devolve a análise. Guarda só o texto. */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > CV_MAX_BYTES + 128 * 1024) return Response.json({ error: "O arquivo passa de 5 MB." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const pasted = String(form?.get("text") ?? "").trim();
  const target = String(form?.get("target") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

  // a análise é sempre para um cargo: sem cargo-alvo, nada é analisado
  if (target.length < 2) return Response.json({ error: "Diga primeiro para qual cargo você quer ser encontrado." }, { status: 400 });

  try {
    let content;
    let fileName = "";
    if (file instanceof File && file.size > 0) {
      if (file.size > CV_MAX_BYTES) return Response.json({ error: "O arquivo passa de 5 MB." }, { status: 413 });
      content = await fileContent({ name: file.name, type: file.type, buffer: Buffer.from(await file.arrayBuffer()) });
      fileName = file.name.slice(0, 120);
    } else if (pasted.length >= 80) {
      content = [{ type: "text" as const, text: `Este é o perfil do LinkedIn:\n\n${pasted.slice(0, 40_000)}\n\nAnalise.` }];
      fileName = "texto colado";
    } else {
      return Response.json({ error: "Envie o PDF do perfil ou cole o texto dele (pelo menos algumas linhas)." }, { status: 400 });
    }
    const daily = (await getAiConfig()).features.linkedin.daily;
    await rateLimit("linkedin", userId, daily, 86400_000, `Limite de ${daily} análises de perfil por dia atingido. Tente amanhã.`);
    const { text, analysis } = await analyzeLinkedin(content, target);
    await saveLinkedin(userId, { text, target_role: target, file_name: fileName, analysis });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof CvError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "";
    if (/Limite de/.test(msg)) return Response.json({ error: msg }, { status: 429 });
    console.error("[linkedin]", msg);
    return Response.json({ error: "Não consegui analisar o perfil agora." }, { status: 500 });
  }
}
