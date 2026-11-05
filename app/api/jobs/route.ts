import { getUserId } from "@/lib/auth";
import { ackAiJob, activeAiJobs } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Análises em segundo plano da pessoa (para o aviso flutuante). */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return Response.json({ jobs: [] }, { status: 401 });
  return Response.json({ jobs: await activeAiJobs(userId) });
}

/** Fecha o aviso de uma análise terminada. */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id === "string") await ackAiJob(userId, body.id.slice(0, 80));
  return Response.json({ ok: true });
}
