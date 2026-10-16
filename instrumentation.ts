// Agendador interno: a cada minuto roda as buscas vencidas (respeitando a frequência de cada uma).
// Em serverless, defina DISABLE_INTERNAL_SCHEDULER=1 e chame /api/cron por um cron externo.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_INTERNAL_SCHEDULER) return;
  const g = globalThis as unknown as { __vagasTick?: NodeJS.Timeout };
  if (g.__vagasTick) return;
  // Se o agendador falhar ao carregar, o site continua no ar (e o painel mostra "Robô parado").
  let mod: typeof import("./lib/runner");
  try {
    mod = await import("./lib/runner");
  } catch (e) {
    console.error("[robô] não consegui iniciar o agendador:", e);
    return;
  }
  const { runDue, beat } = mod;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await beat();
      const r = await runDue();
      if (r.length) console.log(`[robô] ${r.length} busca(s) executada(s)`, r.map((x) => `${x.id.slice(0, 6)}+${x.added}`).join(" "));
    } catch (e) {
      console.error("[robô] falha", e);
    } finally {
      busy = false;
    }
  };
  g.__vagasTick = setInterval(tick, 60_000);
  setTimeout(tick, 5_000);
}
