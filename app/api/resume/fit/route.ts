import { getUserId } from "@/lib/auth";
import { quickFitJobs } from "@/lib/resume-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Checagem rápida de compatibilidade para uma lista de vagas (até 10 por pedido = 1 chamada à IA).
 * É uma rota, e não server action, porque a verificação em massa manda vários pedidos em paralelo,
 * e as server actions de um mesmo cliente rodam uma de cada vez.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { jobIds?: unknown; force?: unknown } | null;
  const ids = Array.isArray(body?.jobIds) ? body.jobIds.filter((x): x is string => typeof x === "string" && x.length <= 80).slice(0, 10) : [];
  if (!ids.length) return Response.json({ error: "Nenhuma vaga" }, { status: 400 });
  try {
    return Response.json({ results: await quickFitJobs(userId, ids, { force: body?.force === true }) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não consegui verificar agora.";
    return Response.json({ error: msg }, { status: /currículo primeiro/.test(msg) ? 422 : 500 });
  }
}
