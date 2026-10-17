"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Copy, MapPin, RefreshCw, Sparkles, X } from "lucide-react";
import { retryContacts, seeJob } from "@/app/actions";
import { AutoRefresh } from "./auto-refresh";
import { Avatar } from "./avatar";
import { FavoriteButton } from "./favorite-button";
import { timeAgo } from "@/lib/format";
import { sourceLabel } from "@/lib/sources";
import type { Contact, ContactRole, Job } from "@/lib/types";

const ROLES: Record<ContactRole, { title: string; hint: string; chip: string }> = {
  recruiter: { title: "Recrutamento & People", hint: "Quem abre a porta do processo", chip: "Recrutador(a)" },
  leader: { title: "Liderança da área", hint: "Quem decide e contrata", chip: "Liderança" },
  peer: { title: "Pessoas do time", hint: "Quem pode contar como é por dentro", chip: "Time" },
};

function icebreaker(c: Contact, job: Job) {
  const first = c.name.split(" ")[0];
  if (c.role === "recruiter") return `Olá ${first}, tudo bem? Vi a vaga de ${job.title} na ${job.company} e me interessei muito pelo desafio. Posso te enviar meu currículo ou tirar uma dúvida rápida sobre o processo?`;
  if (c.role === "leader") return `Olá ${first}, acompanho o trabalho do time na ${job.company} e estou me candidatando à vaga de ${job.title}. Adoraria entender melhor os desafios da área. Teria 15 minutos para uma conversa rápida?`;
  return `Olá ${first}! Vi que você atua na ${job.company} e estou considerando a vaga de ${job.title}. Posso te fazer duas perguntas sobre como é o dia a dia por aí?`;
}

export function JobDrawer({ job, contacts, closeHref }: { job: Job; contacts: Contact[]; closeHref: string }) {
  const router = useRouter();

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && router.push(closeHref, { scroll: false });
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [router, closeHref]);

  useEffect(() => { if (!job.seen) seeJob(job.id); }, [job.id, job.seen]);

  const fav = job.favorite === 1;
  const pending = job.contacts_status === "pending";

  return (
    <div className="fixed inset-0 z-50">
      <Link href={closeHref} scroll={false} aria-label="Fechar" className="anim-fade absolute inset-0 bg-ink/45 backdrop-blur-[2px]" />
      <aside role="dialog" aria-label={job.title} className="anim-slide scroll-thin absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col overflow-y-auto border-l border-line bg-bg shadow-pop">
        <AutoRefresh active={pending} every={2000} />
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-6 py-3 backdrop-blur">
          <span className="text-xs font-medium tracking-wider text-ink-3 uppercase">Detalhes da vaga</span>
          <Link href={closeHref} scroll={false} className="grid size-11 place-items-center rounded-full hover:bg-surface-2 sm:size-9" aria-label="Fechar"><X className="size-5" /></Link>
        </div>

        <div className="px-5 pt-6 pb-4 sm:px-6">
          <Avatar name={job.company} size={64} />
          <h2 className="font-display mt-5 text-3xl leading-[1.05] sm:text-4xl">{job.title}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-ink-2">
            <span className="font-medium text-ink">{job.company}</span>
            {job.location && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{job.location}</span>}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-3">
            <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-ink-2">{sourceLabel(job.source)}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-ink-2"><span className="size-1.5 rounded-full" style={{ background: job.search_color }} />{job.search_name}</span>
            <span>encontrada {timeAgo(job.found_at)}</span>
          </div>
          {job.snippet && <p className="mt-5 rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed text-ink-2">{job.snippet}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 font-medium text-bg transition hover:opacity-85">Abrir vaga <ArrowUpRight className="size-4" /></a>
            <FavoriteButton jobId={job.id} favorite={fav} label />
          </div>
        </div>

        <section className="pb-safe mt-2 flex-1 border-t border-line bg-surface-2/40 px-5 py-6 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-3xl">Pessoas para conhecer</h3>
              <p className="mt-1 text-sm text-ink-3">Perfis públicos do LinkedIn encontrados via Google.</p>
            </div>
            {fav && !pending && <Retry id={job.id} />}
          </div>

          <div className="mt-5">
            {!fav && <Empty icon={<Sparkles className="size-5" />} title="Favorite para destravar" body="Ao favoritar, o robô vasculha o Google atrás de recrutadores, lideranças e gente do time na empresa." />}
            {fav && pending && <Skeletons />}
            {fav && job.contacts_status === "error" && <Empty title="Não deu para buscar agora" body={job.contacts_error ?? "Tente novamente em instantes."} />}
            {fav && job.contacts_status === "done" && contacts.length === 0 && (
              <Empty title="Nenhum perfil do RH ou da área encontrado" body={job.contacts_note ?? "O Google não devolveu perfis ligados a essa empresa. Tente a busca manual."} action={
                <a className="mt-3 inline-block text-sm font-medium text-accent underline underline-offset-4" target="_blank" rel="noopener noreferrer"
                  href={`https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${job.company}"`)}`}>Buscar no Google →</a>} />
            )}
            {fav && job.contacts_status === "done" && contacts.length > 0 && (
              <div className="space-y-7">
                {job.contacts_note && <p className="-mt-1 text-xs text-ink-3">{job.contacts_note}</p>}
                {(["recruiter", "leader", "peer"] as ContactRole[]).map((r) => {
                  const list = contacts.filter((c) => c.role === r);
                  if (!list.length) return null;
                  return (
                    <div key={r}>
                      <div className="mb-3 flex items-baseline gap-2"><h4 className="text-sm font-semibold">{ROLES[r].title}</h4><span className="text-xs text-ink-3">{ROLES[r].hint}</span></div>
                      <ul className="space-y-3">{list.map((c, i) => <ContactCard key={c.id} c={c} job={job} i={i} />)}</ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function ContactCard({ c, job, i }: { c: Contact; job: Job; i: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="anim-rise rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: `${i * 60}ms` }}>
      <div className="flex gap-3">
        <Avatar name={c.name} size={44} round />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">{c.name}
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase">{ROLES[c.role].chip}</span>
          </p>
          {c.headline && <p className="mt-0.5 text-sm text-ink-2">{c.headline}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#0a66c2] px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:opacity-90">
          <span className="rounded-[3px] bg-white px-[3px] text-[10px] leading-[14px] font-extrabold text-[#0a66c2]">in</span> Ver perfil
        </a>
        <button onClick={async () => { await navigator.clipboard.writeText(icebreaker(c, job)); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium transition hover:bg-surface-2">
          {copied ? <><Check className="size-3.5 text-ok" /> Copiada</> : <><Copy className="size-3.5" /> Copiar mensagem</>}
        </button>
      </div>
    </li>
  );
}

function Retry({ id }: { id: string }) {
  const [p, start] = useTransition();
  return (
    <button disabled={p} onClick={() => start(async () => { await retryContacts(id); })} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium transition hover:bg-surface-2 disabled:opacity-50">
      <RefreshCw className={`size-3.5 ${p ? "spin" : ""}`} /> Buscar de novo
    </button>
  );
}

function Skeletons() {
  return (
    <div aria-busy="true" aria-label="Buscando pessoas no LinkedIn">
      <p className="mb-4 flex items-center gap-2 text-sm text-accent"><span className="pulse-dot size-2 rounded-full bg-accent" /> Vasculhando o LinkedIn pelo Google…</p>
      <div className="space-y-3">
        {[0, 1, 2].map((n) => (
          <div key={n} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
            <div className="skeleton size-11 rounded-full" />
            <div className="flex-1 space-y-2.5 pt-1"><div className="skeleton h-3.5 w-1/2 rounded" /><div className="skeleton h-3 w-3/4 rounded" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ title, body, icon, action }: { title: string; body: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center">
      {icon && <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-accent-soft text-accent">{icon}</span>}
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">{body}</p>
      {action}
    </div>
  );
}
