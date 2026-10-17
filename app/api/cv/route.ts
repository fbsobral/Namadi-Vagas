import { getUserId } from "@/lib/auth";
import { analyzeCv, CV_MAX_BYTES, CvError } from "@/lib/cv";
import { getKv, setKv } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DAILY_LIMIT = Number(process.env.CV_DAILY_LIMIT || 10);

/** Lê um CV e devolve sugestões para preencher a busca. O arquivo é processado em memória e descartado. */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Envie um arquivo." }, { status: 400 });
  if (file.size > CV_MAX_BYTES) return Response.json({ error: "O arquivo passa de 5 MB." }, { status: 413 });

  // limite diário por usuário (cada leitura é uma chamada paga à IA)
  const key = `cv:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number((await getKv(key))?.value ?? 0);
  if (used >= DAILY_LIMIT) return Response.json({ error: `Limite de ${DAILY_LIMIT} leituras de CV por dia atingido. Tente amanhã.` }, { status: 429 });

  try {
    const analysis = await analyzeCv({ name: file.name, type: file.type, buffer: Buffer.from(await file.arrayBuffer()) });
    await setKv(key, String(used + 1)); // só conta leituras que deram certo
    return Response.json(analysis);
  } catch (e) {
    if (e instanceof CvError) return Response.json({ error: e.message }, { status: e.status });
    console.error("[cv]", e instanceof Error ? e.message : e);
    return Response.json({ error: "Não consegui ler o currículo agora." }, { status: 500 });
  }
}
