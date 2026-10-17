import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { FavoriteButton } from "./favorite-button";
import { Avatar } from "./avatar";
import { KeepButton } from "./keep-button";
import { timeAgo } from "@/lib/format";
import { sourceLabel } from "@/lib/sources";
import type { Job } from "@/lib/types";

export function JobCard({ job, href, showSearch, index }: { job: Job; href: string; showSearch: boolean; index: number }) {
  return (
    <article
      className="group anim-rise relative rounded-3xl border border-line bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-ink-3/40 hover:shadow-pop"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <Link href={href} scroll={false} className="block rounded-3xl p-4 pr-14 focus-visible:outline-2 focus-visible:outline-accent sm:p-5 sm:pr-16" aria-label={`${job.title} na ${job.company}`}>
        <div className="flex gap-3 sm:gap-4">
          <Avatar name={job.company} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-base leading-snug font-semibold sm:text-[17px]">{job.title}</h3>
              {!job.seen && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-ink">NOVA</span>}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
              <span className="font-medium">{job.company}</span>
              {job.location && <span className="inline-flex items-center gap-1 text-ink-3"><MapPin className="size-3.5" />{job.location}</span>}
            </p>
            {job.snippet && <p className="line-clamp-2 mt-3 text-sm leading-relaxed text-ink-2">{job.snippet}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-3">
              <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-ink-2">{sourceLabel(job.source)}</span>
              {showSearch && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-ink-2">
                  <span className="size-1.5 rounded-full" style={{ background: job.search_color }} />{job.search_name}
                </span>
              )}
              <span>encontrada {timeAgo(job.found_at)}</span>
              {job.filtered === 1 && job.filtered_reason && <span className="text-accent">filtrada: {job.filtered_reason}</span>}
              {job.favorite === 1 && job.contacts_status === "pending" && <span className="text-accent">buscando pessoas…</span>}
              {job.favorite === 1 && job.contacts_status === "done" && <span className="text-ok">contatos prontos</span>}
            </div>
          </div>
        </div>
      </Link>
      {job.filtered === 1 && job.is_owner !== false && <div className="border-t border-line px-4 py-3 sm:px-5"><KeepButton jobId={job.id} /></div>}
      <div className="absolute top-2 right-2 flex flex-col items-center gap-0.5 sm:top-4 sm:right-4 sm:gap-1">
        <FavoriteButton jobId={job.id} favorite={job.favorite === 1} />
        <a href={job.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir vaga em nova aba" className="grid size-10 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
          <ArrowUpRight className="size-5" />
        </a>
      </div>
    </article>
  );
}
