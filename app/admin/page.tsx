import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserId, getViewer, isAdminViewer } from "@/lib/auth";
import { aiUsageSince, type AiUsageRow } from "@/lib/db";
import { aiKeyConfigured, getAiConfig } from "@/lib/ai-config";
import { AI_FEATURES, estimateCost } from "@/lib/ai-shared";
import { Logo } from "@/components/logo";
import { AdminAi, type UsageStats } from "@/components/admin-ai";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · IA — Namadi Vagas", robots: { index: false } };

export default async function AdminPage() {
  if (!(await getUserId())) redirect("/sign-in");
  if (!isAdminViewer(await getViewer())) notFound(); // só administradores (ADMIN_EMAILS); os demais nem sabem que existe

  const [cfg, rows] = await Promise.all([getAiConfig(), aiUsageSince(30)]);
  const stats = buildStats(rows);

  return (
    <div className="relative z-10 min-h-dvh">
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm text-ink-2 hover:text-ink"><ArrowLeft className="size-4" /> Painel</Link>
          <span className="ml-auto"><Logo size={24} /></span>
        </div>
      </header>
      <main className="pb-safe mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6 sm:pt-10">
        <p className="text-xs font-medium tracking-wider text-accent uppercase">Administração</p>
        <h1 className="font-display mt-1 text-4xl leading-none sm:text-6xl">Inteligência artificial</h1>
        <p className="mt-3 max-w-2xl text-ink-2">Ligue ou desligue cada recurso, escolha o modelo e o limite diário por pessoa, e acompanhe o consumo. As mudanças valem em até 20 segundos.</p>
        <AdminAi initial={cfg} stats={stats} keyConfigured={aiKeyConfigured()} features={AI_FEATURES.map((f) => ({ key: f.key, label: f.label, where: f.where, when: f.when }))} />
      </main>
    </div>
  );
}

/** Soma o consumo por período (hoje, 7 e 30 dias), por recurso e por modelo. */
function buildStats(rows: AiUsageRow[]): UsageStats {
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);
  const empty = () => ({ calls: 0, errors: 0, input: 0, output: 0, cost: 0 });
  const stats: UsageStats = { total: { today: empty(), week: empty(), month: empty() }, byFeature: {}, models: {} };
  for (const r of rows) {
    const add = (b: ReturnType<typeof empty>) => {
      b.calls += Number(r.calls); b.errors += Number(r.errors); b.input += Number(r.input_tokens); b.output += Number(r.output_tokens);
      b.cost += estimateCost(r.model, Number(r.input_tokens), Number(r.output_tokens));
    };
    const f = (stats.byFeature[r.feature] ??= { today: empty(), week: empty(), month: empty() });
    add(stats.total.month); add(f.month);
    if (r.day >= week) { add(stats.total.week); add(f.week); }
    if (r.day === today) { add(stats.total.today); add(f.today); }
    add((stats.models[r.model] ??= empty()));
  }

  return stats;
}
