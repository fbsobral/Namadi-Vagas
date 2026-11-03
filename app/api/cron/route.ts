import { timingSafeEqual } from "node:crypto";
import { runDue } from "@/lib/runner";
import { runDigests } from "@/lib/notify";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Gatilho externo opcional (o agendador interno já roda sozinho). Fechado se CRON_SECRET não existir. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });
  if (!same(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  return Response.json({ ran: await runDue(), digests: await runDigests() });
}
