import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getUserId, getViewer, isAdminViewer } from "@/lib/auth";
import { aiFlags } from "@/lib/ai-config";
import { AiFlagsProvider } from "@/components/ai-flags";
import { getAutoFit, getKv, getSeenGuides, jobCounts, listCvs, listJobsForFit, listSearches, searchCvMap } from "@/lib/db";
import { fitQuota } from "@/lib/resume-service";
import { isFresh } from "@/lib/format";
import { Sidebar } from "@/components/sidebar";
import { OnboardingProvider } from "@/components/onboarding";
import { HelpButton } from "@/components/guide";
import { ResumeModule } from "@/components/resume-module";

export const dynamic = "force-dynamic";

export default async function CurriculoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await getUserId();
  if (!userId) redirect("/sign-in");
  const sp = await searchParams;
  const [searches, counts, viewer, seenGuides, beat, cvs, quota, flags, autoFit, chosen] = await Promise.all([
    listSearches(userId), jobCounts(userId), getViewer(), getSeenGuides(userId), getKv("scheduler_heartbeat"), listCvs(userId), fitQuota(userId), aiFlags(), getAutoFit(userId), searchCvMap(userId),
  ]);
  // currículo aberto: o pedido na URL, senão o principal
  const cv = cvs.find((c) => c.id === sp.cv) ?? cvs.find((c) => c.is_primary) ?? cvs[0] ?? null;
  const jobs = cv ? await listJobsForFit(userId, cv.id) : [];
  const primaryId = cvs.find((c) => c.is_primary)?.id;
  const usedBy = cv ? searches.filter((s) => (chosen[s.id] ?? primaryId) === cv.id).map((s) => ({ id: s.id, name: s.name, color: s.color })) : [];
  const lite = cvs.map((c) => ({ id: c.id, name: c.target_role || c.name, target_role: c.target_role, is_primary: c.is_primary, score: c.analysis.score, updated_at: c.updated_at }));

  return (
    <AiFlagsProvider flags={flags}>
    <OnboardingProvider seen={seenGuides} hasSearches={searches.length > 0}>
      <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
        <Sidebar searches={searches} counts={counts} currentId={null} filter="all" view="cv" robotOnline={isFresh(beat?.updated_at, 3 * 60_000)} isAdmin={isAdminViewer(viewer)}>
          <UserButton />
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{viewer?.firstName ?? viewer?.name ?? "Você"}</p>
            <p className="truncate text-xs text-ink-3">{viewer?.email}</p>
          </div>
        </Sidebar>

        <main className="pb-safe min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-8 sm:pt-8 lg:px-12">
          <div className="mx-auto w-full max-w-[1200px]">
            <header className="anim-rise">
              <p className="text-sm text-ink-3">com IA</p>
              <div className="mt-1 flex items-start gap-2">
                <h1 className="font-display min-w-0 flex-1 text-4xl leading-none sm:text-6xl">Currículo</h1>
                <HelpButton id="resume" className="mt-0.5 border border-line bg-surface sm:mt-2" />
              </div>
              <p className="mt-3 max-w-2xl text-ink-2">Um currículo para cada objetivo, com nota, sugestões, compatibilidade com as vagas e carta de apresentação.</p>
            </header>
            <ResumeModule cvs={lite} cv={cv} jobs={jobs} quota={quota} configured={flags.resume} autoFit={autoFit} usedBy={usedBy} />
          </div>
        </main>
      </div>
    </OnboardingProvider>
    </AiFlagsProvider>
  );
}
