import { getUserId } from "@/lib/auth";
import { analyzeResume, CV_MAX_BYTES, CvError, fileContent } from "@/lib/resume";
import { rateLimit, saveResume } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const DAILY = Number(process.env.RESUME_DAILY_LIMIT || 8);

/** Envia um currículo para o módulo Currículo: a IA lê, pontua e o TEXTO fica guardado (o arquivo é descartado). */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > CV_MAX_BYTES + 64 * 1024) return Response.json({ error: "O arquivo passa de 5 MB." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Envie um arquivo." }, { status: 400 });
  if (file.size > CV_MAX_BYTES) return Response.json({ error: "O arquivo passa de 5 MB." }, { status: 413 });

  try {
    await rateLimit("resume", userId, DAILY, 86400_000, `Limite de ${DAILY} análises de currículo por dia atingido. Tente amanhã.`);
    const content = await fileContent({ name: file.name, type: file.type, buffer: Buffer.from(await file.arrayBuffer()) });
    const { text, analysis } = await analyzeResume(content);
    await saveResume(userId, file.name.slice(0, 120), text, analysis);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof CvError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "";
    if (/Limite de/.test(msg)) return Response.json({ error: msg }, { status: 429 });
    console.error("[resume]", msg);
    return Response.json({ error: "Não consegui analisar o currículo agora." }, { status: 500 });
  }
}
