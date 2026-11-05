import { getUserId } from "@/lib/auth";
import { analyzeResume, CV_MAX_BYTES, CvError, fileContent } from "@/lib/resume";
import { countCvs, createCv, getCv, MAX_CVS, rateLimit, saveCvAnalysis, updateCvMeta } from "@/lib/db";
import { getAiConfig } from "@/lib/ai-config";

export const dynamic = "force-dynamic";
export const maxDuration = 180;


/**
 * Envia um currículo para o módulo Currículo: a IA lê, pontua (para o cargo-alvo, se houver) e o TEXTO fica guardado
 * (o arquivo é descartado). Com `cvId`, substitui aquele currículo; sem, cria um novo (até MAX_CVS).
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > CV_MAX_BYTES + 64 * 1024) return Response.json({ error: "O arquivo passa de 5 MB." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Envie um arquivo." }, { status: 400 });
  if (file.size > CV_MAX_BYTES) return Response.json({ error: "O arquivo passa de 5 MB." }, { status: 413 });

  const cvId = String(form?.get("cvId") ?? "");
  const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const existing = cvId ? await getCv(userId, cvId) : null;
  if (cvId && !existing) return Response.json({ error: "Currículo não encontrado." }, { status: 404 });
  if (!existing && (await countCvs(userId)) >= MAX_CVS) return Response.json({ error: `Você já tem ${MAX_CVS} currículos. Apague um para enviar outro.` }, { status: 400 });
  // a análise é sempre para um cargo: currículo novo precisa do cargo-alvo; ao trocar o arquivo, vale o do currículo
  const target = clean(form?.get("target"), 120) || existing?.target_role || "";
  if (target.length < 2) return Response.json({ error: "Diga primeiro o cargo-alvo deste currículo." }, { status: 400 });

  try {
    const DAILY = (await getAiConfig()).features.resume.daily;
    await rateLimit("resume", userId, DAILY, 86400_000, `Limite de ${DAILY} análises de currículo por dia atingido. Tente amanhã.`);
    const content = await fileContent({ name: file.name, type: file.type, buffer: Buffer.from(await file.arrayBuffer()) });
    const { text, analysis } = await analyzeResume(content, target);
    const fileName = file.name.slice(0, 120);
    if (existing) {
      if (target !== existing.target_role) await updateCvMeta(userId, existing.id, target.slice(0, 60), target);
      await saveCvAnalysis(existing.id, fileName, text, analysis);
      return Response.json({ ok: true, id: existing.id });
    }
    // o nome do currículo é o próprio cargo-alvo
    const id = await createCv(userId, { name: target.slice(0, 60), target_role: target, file_name: fileName, text, analysis });
    return Response.json({ ok: true, id });
  } catch (e) {
    if (e instanceof CvError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "";
    if (/Limite de/.test(msg)) return Response.json({ error: msg }, { status: 429 });
    console.error("[resume]", msg);
    return Response.json({ error: "Não consegui analisar o currículo agora." }, { status: 500 });
  }
}
