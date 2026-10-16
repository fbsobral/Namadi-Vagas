import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getUserId } from "@/lib/auth";
import { UserButton } from "@clerk/nextjs";
import { AlertTriangle, Radar as RadarIcon, Star } from "lucide-react";
import { getJob, jobCounts, listContacts, listJobs, listSearches, type JobFilter } from "@/lib/db";
import { isDemoMode } from "@/lib/serp";
import { buildGoogleQuery, freqLabel } from "@/lib/sources";
import { timeAgo } from "@/lib/format";
import { Sidebar } from "@/components/sidebar";
import { SearchToolbar } from "@/components/search-toolbar";
import { JobCard } from "@/components/job-card";
import { JobDrawer } from "@/components/job-drawer";
import { AutoRefresh } from "@/components/auto-refresh";
import { NewSearchButton } from "@/components/new-search-button";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const userId = await getUserId();
  if (!userId) redirect("/sign-in");
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);

  const [searches, counts, user] = await Promise.all([listSearches(userId), jobCounts(userId), currentUser()]);
  const current = searches.find((s) => s.id === one("s")) ?? null;
  const filter: JobFilter = one("f") === "new" ? "new" : one("f") === "fav" ? "fav" : "all";
  const jobs = await listJobs(userId, { searchId: current?.id, filter });
  const jobId = one("job");
  const drawerJob = jobId ? await getJob(userId, jobId) : null;
  const contacts = drawerJob ? await listContacts(drawerJob.id) : [];

  const base = (extra: Record<string, string | null> = {}) => {
    const p = new URLSearchParams();
    if (current) p.set("s", current.id);
    const f = "f" in extra ? extra.f : filter === "all" ? null : filter;
    if (f) p.set("f", f);
    if (extra.job) p.set("job", extra.job);
    const q = p.toString();
    return `/dashboard${q ? `?${q}` : ""}`;
  };

  const anyRunning = searches.some((s) => s.last_status === "running");
  const title = current ? current.name : filter === "fav" ? "Favoritas" : "Todas as vagas";
  const sources = current ? (JSON.parse(current.sources) as string[]) : [];

  return (
    <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
      <AutoRefresh active={anyRunning} />
      <Sidebar searches={searches} counts={counts} currentId={current?.id ?? null} filter={filter}>
        <UserButton />
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{user?.firstName ?? user?.username ?? "Você"}</p>
          <p className="truncate text-xs text-ink-3">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </Sidebar>

      <main className="min-w-0 flex-1 px-4 pt-8 pb-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          {isDemoMode() && (
            <div role="note" className="anim-rise mb-6 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" />
              <p><strong>Modo demonstração</strong> (<code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">DEMO_MODE=1</code>). As vagas e contatos abaixo são fictícios. Remova a variável para o robô buscar de verdade.</p>
            </div>
          )}

          <header className="anim-rise">
            <div className="flex items-center gap-2 text-sm text-ink-3">
              {current && <span className="size-2.5 rounded-full" style={{ background: current.color }} />}
              {current ? (current.active ? <span className="inline-flex items-center gap-1.5">robô {current.last_status === "running" ? "buscando agora…" : `ativo · ${freqLabel(current.freq_minutes)}`}</span> : "pausada") : "visão geral"}
            </div>
            <h1 className="font-display mt-1 text-5xl leading-none sm:text-6xl">{title}</h1>
            {current ? (
              <>
                <p className="mt-3 max-w-2xl font-mono text-[13px] leading-relaxed text-ink-3">{buildGoogleQuery(current.query, current.location, sources)}</p>
                <p className="mt-2 text-sm text-ink-3">
                  Última rodada {timeAgo(current.last_run_at)}{current.active && current.next_run_at ? ` · próxima ${timeAgo(current.next_run_at)}` : ""}
                </p>
                {current.last_status === "error" && <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1.5 text-sm text-accent"><AlertTriangle className="size-4" /> {current.last_error}</p>}
                <div className="mt-5"><SearchToolbar search={current} unseen={jobs.filter((j) => !j.seen).length} /></div>
              </>
            ) : (
              <p className="mt-3 text-ink-2">{counts.total} vagas · {counts.unseen} novas · {counts.favs} favoritas</p>
            )}
          </header>

          {filter !== "fav" || current ? (
            <div className="mt-8 flex gap-1 border-b border-line" role="tablist">
              {([["all", "Todas"], ["new", "Novas"], ["fav", "Favoritas"]] as const).map(([k, l]) => (
                <Link key={k} href={base({ f: k === "all" ? null : k })} role="tab" aria-selected={filter === k}
                  className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition ${filter === k ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{l}</Link>
              ))}
            </div>
          ) : <div className="mt-8 border-b border-line" />}

          <div className="mt-6 grid gap-4">
            {jobs.map((j, i) => <JobCard key={j.id} job={j} index={i} showSearch={!current} href={base({ job: j.id })} />)}
            {jobs.length === 0 && <EmptyState hasSearches={searches.length > 0} current={!!current} filter={filter} running={current?.last_status === "running"} />}
          </div>
        </div>
      </main>

      {drawerJob && <JobDrawer job={drawerJob} contacts={contacts} closeHref={base()} />}
    </div>
  );
}

function EmptyState({ hasSearches, current, filter, running }: { hasSearches: boolean; current: boolean; filter: JobFilter; running: boolean }) {
  const fav = filter === "fav";
  return (
    <div className="anim-rise grid place-items-center rounded-[28px] border border-dashed border-line bg-surface/50 px-6 py-20 text-center">
      <span className="mb-5 grid size-16 place-items-center rounded-3xl bg-accent-soft text-accent">{fav ? <Star className="size-7" /> : <RadarIcon className={`size-7 ${running ? "spin" : ""}`} />}</span>
      <h2 className="font-display text-4xl">{fav ? "Nenhuma favorita ainda" : running ? "Varrendo o Google…" : hasSearches ? "Nada por aqui (ainda)" : "Seu radar está vazio"}</h2>
      <p className="mt-2 max-w-md text-ink-2">
        {fav ? "Toque na estrela de uma vaga: o robô busca recrutadores, lideranças e gente do time para você conhecer."
          : running ? "As primeiras vagas aparecem em instantes."
          : hasSearches ? (current ? "O robô ainda não encontrou nada novo. Use “Rodar agora” ou aumente a janela de tempo." : "Selecione uma busca ou aguarde a próxima rodada do robô.")
          : "Crie sua primeira busca personalizada. O robô cuida do resto, na frequência que você escolher."}
      </p>
      {!hasSearches && <NewSearchButton />}
    </div>
  );
}
