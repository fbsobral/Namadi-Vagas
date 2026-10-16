import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getUserId } from "@/lib/auth";
import { UserButton } from "@clerk/nextjs";
import { AlertTriangle, Columns3, LayoutList, Radar as RadarIcon, Star } from "lucide-react";
import { getJob, getKv, jobCounts, listContacts, listJobs, listRuns, listSearches, type JobFilter } from "@/lib/db";
import { isDemoMode } from "@/lib/serp";
import { freqLabel, sourceLabel } from "@/lib/sources";
import { parseSpec, specToBoolean } from "@/lib/query";
import { isFresh, timeAgo } from "@/lib/format";
import { Sidebar } from "@/components/sidebar";
import { SearchToolbar } from "@/components/search-toolbar";
import { JobCard } from "@/components/job-card";
import { JobDrawer } from "@/components/job-drawer";
import { AutoRefresh } from "@/components/auto-refresh";
import { RobotStatus, RunHistory } from "@/components/robot-status";
import { NewSearchButton } from "@/components/new-search-button";
import { KanbanBoard } from "@/components/kanban-board";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const userId = await getUserId();
  if (!userId) redirect("/sign-in");
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);

  const [searches, counts, user] = await Promise.all([listSearches(userId), jobCounts(userId), currentUser()]);
  const current = searches.find((s) => s.id === one("s")) ?? null;
  const view = one("v") === "board" ? "board" : "list";
  const filter: JobFilter = view === "board" ? "board" : one("f") === "new" ? "new" : one("f") === "fav" ? "fav" : "all";
  const jobs = await listJobs(userId, { searchId: current?.id, filter });
  const [beat, runs] = await Promise.all([getKv("scheduler_heartbeat"), current ? listRuns(current.id) : Promise.resolve([])]);
  const jobId = one("job");
  const drawerJob = jobId ? await getJob(userId, jobId) : null;
  const contacts = drawerJob ? await listContacts(drawerJob.id) : [];

  const base = (extra: Record<string, string | null> = {}) => {
    const p = new URLSearchParams();
    if (current) p.set("s", current.id);
    if (view === "board") p.set("v", "board");
    const f = "f" in extra ? extra.f : filter === "all" || filter === "board" ? null : filter;
    if (f && view !== "board") p.set("f", f);
    if (extra.job) p.set("job", extra.job);
    const q = p.toString();
    return `/dashboard${q ? `?${q}` : ""}`;
  };

  const viewHref = (v: "list" | "board") => {
    const p = new URLSearchParams();
    if (current) p.set("s", current.id);
    if (v === "board") p.set("v", "board");
    else if (one("f") === "new" || one("f") === "fav") p.set("f", one("f")!);
    const q = p.toString();
    return `/dashboard${q ? `?${q}` : ""}`;
  };

  const anyRunning = searches.some((s) => s.last_status === "running");
  const title = current ? current.name : filter === "fav" ? "Favoritas" : "Todas as vagas";
  const sources = current ? (JSON.parse(current.sources) as string[]) : [];

  return (
    <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
      <AutoRefresh active={anyRunning} />
      <Sidebar searches={searches} counts={counts} currentId={current?.id ?? null} filter={filter} view={view} robotOnline={isFresh(beat?.updated_at, 3 * 60_000)}>
        <UserButton />
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{user?.firstName ?? user?.username ?? "Você"}</p>
          <p className="truncate text-xs text-ink-3">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </Sidebar>

      <main className="pb-safe min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-8 sm:pt-8 lg:px-12">
        <div className="mx-auto w-full max-w-[1600px]">
          {isDemoMode() && (
            <div role="note" className="anim-rise mb-6 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" />
              <p><strong>Modo demonstração</strong> (<code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">DEMO_MODE=1</code>). As vagas e contatos abaixo são fictícios. Remova a variável para o robô buscar de verdade.</p>
            </div>
          )}

          <div className="mb-5 hidden justify-end lg:flex"><RobotStatus lastBeat={beat?.updated_at ?? null} online={isFresh(beat?.updated_at, 3 * 60_000)} /></div>

          <header className="anim-rise">
            <div className="flex items-center gap-2 text-sm text-ink-3">
              {current && <span className="size-2.5 rounded-full" style={{ background: current.color }} />}
              {current ? (current.active ? <span className="inline-flex items-center gap-1.5">robô {current.last_status === "running" ? "buscando agora…" : `ativo · ${freqLabel(current.freq_minutes)}`}</span> : "pausada") : "visão geral"}
            </div>
            <h1 className="font-display mt-1 text-4xl leading-none break-words sm:text-6xl">{title}</h1>
            {current ? (
              <>
                <p className="mt-3 max-w-2xl font-mono text-[13px] leading-relaxed text-ink-3">{specToBoolean(parseSpec(current.query_spec, current.query))}{current.location ? ` · ${current.location}` : ""} · {sources.map(sourceLabel).join(", ")}</p>
                <p className="mt-2 text-sm text-ink-3">
                  Última rodada {timeAgo(current.last_run_at)}{current.active && current.next_run_at ? ` · próxima ${timeAgo(current.next_run_at)}` : ""}
                </p>
                {current.last_status === "error" && <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1.5 text-sm text-accent"><AlertTriangle className="size-4" /> {current.last_error}</p>}
                <div className="mt-5"><SearchToolbar search={current} unseen={jobs.filter((j) => !j.seen).length} /></div>
                <RunHistory runs={runs} />
              </>
            ) : (
              <p className="mt-3 text-ink-2">{counts.total} vagas · {counts.unseen} novas · {counts.favs} favoritas</p>
            )}
          </header>

          <div className="mt-6 flex items-end justify-between gap-2 border-b border-line sm:mt-8">
            {view === "list" ? (
              <div className="-mb-px flex min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:none] sm:gap-1 [&::-webkit-scrollbar]:hidden" role="tablist">
                {([["all", "Todas"], ["new", "Novas"], ["fav", "Favoritas"]] as const).map(([k, l]) => (
                  <Link key={k} href={base({ f: k === "all" ? null : k })} role="tab" aria-selected={filter === k}
                    className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition sm:px-4 ${filter === k ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{l}</Link>
                ))}
              </div>
            ) : (
              <p className="pb-3 text-xs text-ink-3 sm:text-sm"><span className="hidden sm:inline">Arraste as vagas entre as etapas da candidatura.</span><span className="sm:hidden">Use o seletor de cada vaga para mover.</span></p>
            )}
            <div role="group" aria-label="Visualização" className="mb-2 inline-flex rounded-full border border-line bg-surface p-0.5 text-sm font-medium">
              {([["list", "Lista", LayoutList], ["board", "Kanban", Columns3]] as const).map(([v, l, Icon]) => (
                <Link key={v} href={viewHref(v)} aria-current={view === v} scroll={false}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 transition sm:px-3.5 sm:py-1.5 ${view === v ? "bg-ink text-bg" : "text-ink-3 hover:text-ink"}`}><Icon className="size-4" /><span className="hidden sm:inline">{l}</span><span className="sr-only sm:hidden">{l}</span></Link>
              ))}
            </div>
          </div>

          {view === "board" ? (
            <div className="mt-6">
              <KanbanBoard jobs={jobs} showSearch={!current} hrefs={Object.fromEntries(jobs.map((j) => [j.id, base({ job: j.id })]))} />
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4">
              {jobs.map((j, i) => <JobCard key={j.id} job={j} index={i} showSearch={!current} href={base({ job: j.id })} />)}
              {jobs.length === 0 && <EmptyState hasSearches={searches.length > 0} current={!!current} filter={filter} running={current?.last_status === "running"} />}
            </div>
          )}
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
