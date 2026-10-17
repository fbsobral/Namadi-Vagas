import { runDue } from "@/lib/runner";
import { runDigests } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ ran: await runDue(), digests: await runDigests() });
}
