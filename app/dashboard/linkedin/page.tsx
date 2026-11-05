import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getUserId, getViewer, isAdminViewer } from "@/lib/auth";
import { aiFlags } from "@/lib/ai-config";
import { getKv, getLinkedin, getSeenGuides, jobCounts, listCvs, listSearches } from "@/lib/db";
import { isFresh } from "@/lib/format";
import { Sidebar } from "@/components/sidebar";
import { OnboardingProvider } from "@/components/onboarding";
import { AiFlagsProvider } from "@/components/ai-flags";
import { BackgroundJobs } from "@/components/background-jobs";
import { HelpButton } from "@/components/guide";
import { LinkedinModule } from "@/components/linkedin-module";

export const dynamic = "force-dynamic";

export default async function LinkedinPage() {
  const userId = await getUserId();
  if (!userId) redirect("/sign-in");
  const [searches, counts, viewer, seenGuides, beat, profile, cvs, flags] = await Promise.all([
    listSearches(userId), jobCounts(userId), getViewer(), getSeenGuides(userId), getKv("scheduler_heartbeat"), getLinkedin(userId), listCvs(userId), aiFlags(),
  ]);
  // sugestões de objetivo: os cargos-alvo dos currículos da pessoa
  const targets = [...new Set(cvs.map((c) => c.target_role || c.analysis.role).filter(Boolean))].slice(0, 5);

  return (
    <AiFlagsProvider flags={flags}>
    <BackgroundJobs>
      <OnboardingProvider seen={seenGuides} hasSearches={searches.length > 0}>
        <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
          <Sidebar searches={searches} counts={counts} currentId={null} filter="all" view="li" robotOnline={isFresh(beat?.updated_at, 3 * 60_000)} isAdmin={isAdminViewer(viewer)}>
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
                  <h1 className="font-display min-w-0 flex-1 text-4xl leading-none sm:text-6xl">Perfil do LinkedIn</h1>
                  <HelpButton id="linkedin" className="mt-0.5 border border-line bg-surface sm:mt-2" />
                </div>
                <p className="mt-3 max-w-2xl text-ink-2">Seja encontrado pelos recrutadores certos: nota do perfil, títulos e Sobre prontos para colar e sugestões por seção.</p>
              </header>
              <LinkedinModule profile={profile} targets={targets} configured={flags.linkedin} />
            </div>
          </main>
        </div>
      </OnboardingProvider>
    </BackgroundJobs>
    </AiFlagsProvider>
  );
}
