// Healthcheck leve (sem banco, sem Clerk): o Coolify só troca o container quando isto responde.
export const dynamic = "force-dynamic";
export const GET = () => new Response("ok", { headers: { "Cache-Control": "no-store" } });
