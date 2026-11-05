import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getUserId, getViewer } from "@/lib/auth";
import { getKv, getResume, getSeenGuides, jobCounts, listFits, listSearches } from "@/lib/db";
import { resumeConfigured } from "@/lib/resume";
import { isFresh } from "@/lib/format";
import { Sidebar } from "@/components/sidebar";
import { OnboardingProvider } from "@/components/onboarding";
import { HelpButton } from "@/components/guide";
import { ResumeModule } from "@/components/resume-module";

export const dynamic = "force-dynamic";

export default async function CurriculoPage() {
  const userId = await getUserId();
  if (!userId) redirect("/sign-in");
  const [searches, counts, viewer, seenGuides, beat, resume, fits] = await Promise.all([
    listSearches(userId), jobCounts(userId), getViewer(), getSeenGuides(userId), getKv("scheduler_heartbeat"), getResume(userId), listFits(userId),
  ]);

  return (
    <OnboardingProvider seen={seenGuides} hasSearches={searches.length > 0}>
      <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
        <Sidebar searches={searches} counts={counts} currentId={null} filter="all" view="cv" robotOnline={isFresh(beat?.updated_at, 3 * 60_000)}>
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
              <p className="mt-3 max-w-2xl text-ink-2">Nota, sugestões seção por seção, compatibilidade com cada vaga e carta de apresentação.</p>
            </header>
            <ResumeModule resume={resume} fits={fits} configured={resumeConfigured()} />
          </div>
        </main>
      </div>
    </OnboardingProvider>
  );
}
