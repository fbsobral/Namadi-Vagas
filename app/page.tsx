import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowUpRight, Bot, GripVertical, Radar as RadarIcon, Star, Users } from "lucide-react";
import { Logo } from "@/components/logo";

export default async function Home() {
  const { userId } = await auth();
  const cta = userId ? { href: "/dashboard", label: "Abrir meu radar" } : { href: "/sign-up", label: "Criar meu radar" };

  return (
    <div className="relative z-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          {!userId && <Link href="/sign-in" className="rounded-full px-4 py-2 text-ink-2 transition hover:text-ink">Entrar</Link>}
          <Link href={cta.href} className="rounded-full bg-ink px-5 py-2.5 font-medium text-bg transition hover:opacity-85">{userId ? "Painel" : "Começar"}</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-10 text-center md:pt-24">
          <p className="anim-rise mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-2 shadow-card">
            <span className="pulse-dot size-2 rounded-full bg-accent" /> Robô vigiando o Google 24h por dia
          </p>
          <h1 className="font-display anim-rise mx-auto max-w-4xl text-[clamp(3rem,8vw,6.5rem)] leading-[0.95]" style={{ animationDelay: ".06s" }}>
            A vaga certa <em className="text-accent">te encontra</em>, e as pessoas certas também.
          </h1>
          <p className="anim-rise mx-auto mt-7 max-w-xl text-lg text-ink-2" style={{ animationDelay: ".12s" }}>
            Salve quantas buscas quiser, escolha a frequência e deixe o robô trazer só o que é novo. Favoritou uma vaga? Ele já descobre quem conhecer no LinkedIn.
          </p>
          <div className="anim-rise mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: ".18s" }}>
            <Link href={cta.href} className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-accent-ink shadow-pop transition hover:-translate-y-0.5 hover:shadow-lg">
              {cta.label} <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a href="#como" className="rounded-full border border-line bg-surface px-6 py-3.5 font-medium transition hover:bg-surface-2">Como funciona</a>
          </div>
        </section>

        <Preview />

        <KanbanSection />

        <section id="como" className="mx-auto grid max-w-6xl gap-4 px-5 py-24 md:grid-cols-3">
          {[
            { i: RadarIcon, t: "Buscas que são suas", d: "Palavras-chave, cidade, fontes (LinkedIn, Gupy, Greenhouse…) e janela de tempo. Salve quantas quiser, cada uma com sua cor." },
            { i: Bot, t: "Um robô na sua frequência", d: "De 30 minutos a uma semana. O robô consulta o Google, filtra o ruído e te mostra só as vagas inéditas." },
            { i: Users, t: "Gente, não só vagas", d: "Favoritou? Em segundos você tem recrutadores, lideranças e pessoas do time no LinkedIn, com mensagem pronta para quebrar o gelo." },
          ].map(({ i: Icon, t, d }, n) => (
            <article key={t} className="rounded-3xl border border-line bg-surface p-7 shadow-card transition hover:-translate-y-1">
              <div className="mb-10 flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="size-5" /></span>
                <span className="font-mono text-xs text-ink-3">0{n + 1}</span>
              </div>
              <h3 className="font-display text-3xl">{t}</h3>
              <p className="mt-3 text-ink-2">{d}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-12 text-sm text-ink-3">© {new Date().getFullYear()} Namadi Vagas</footer>
    </div>
  );
}

function Preview() {
  const jobs = [
    { c: "Nubank", t: "Product Designer Sênior", m: "Remoto · Brasil", s: "LinkedIn", col: "#A855F7", fav: true, n: true },
    { c: "QuintoAndar", t: "Design Lead, Growth", m: "São Paulo, SP", s: "Greenhouse", col: "#2F6BFF", n: true },
    { c: "Hotmart", t: "UX Researcher Pleno", m: "Belo Horizonte, MG", s: "Gupy", col: "#14A37F" },
  ];
  return (
    <div className="anim-rise relative mx-auto max-w-5xl px-5" style={{ animationDelay: ".28s" }}>
      <div className="absolute inset-x-10 -top-6 h-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative grid overflow-hidden rounded-[28px] grid-cols-1 border border-line bg-surface shadow-pop md:grid-cols-[230px_1fr]">
        <aside className="hidden border-r border-line bg-surface-2/60 p-4 md:block">
          <p className="mb-3 px-2 text-[11px] font-medium tracking-wider text-ink-3 uppercase">Minhas buscas</p>
          {[["Product Design", "#E8501F", 12], ["UX Research · remoto", "#2F6BFF", 4], ["Design Lead", "#14A37F", 0]].map(([n, c, k], i) => (
            <div key={n as string} className={`mb-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm ${i === 0 ? "bg-surface shadow-card" : "text-ink-2"}`}>
              <span className="size-2.5 rounded-full" style={{ background: c as string }} /> <span className="truncate">{n}</span>
              {(k as number) > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-medium text-accent-ink">{k}</span>}
            </div>
          ))}
        </aside>
        <div className="min-w-0 p-5 text-left md:p-7">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="font-display text-3xl">Product Design</p>
              <p className="text-sm text-ink-3">a cada 6 horas · próxima rodada em 2h</p>
            </div>
            <span className="hidden rounded-full bg-ok-soft px-3 py-1 text-xs font-medium text-ok sm:inline">● robô ativo</span>
          </div>
          <div className="grid gap-3">
            {jobs.map((j) => (
              <div key={j.t} className="flex items-center gap-4 rounded-2xl border border-line bg-bg/60 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white" style={{ background: j.col }}>{j.c.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{j.t} {j.n && <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">NOVA</span>}</p>
                  <p className="truncate text-sm text-ink-3">{j.c} · {j.m} · {j.s}</p>
                </div>
                <Star className={`size-5 ${j.fav ? "fill-accent text-accent" : "text-ink-3"}`} />
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-accent/40 bg-accent-soft/50 p-4">
            <p className="mb-3 text-xs font-medium tracking-wider text-accent uppercase">Pessoas para conhecer · Nubank</p>
            <div className="flex flex-wrap gap-2">
              {[["Marina Alves", "Talent Acquisition"], ["Rafael Costa", "Head de Design"], ["Camila Duarte", "Staff Designer"]].map(([n, h]) => (
                <span key={n} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-1.5 text-sm">
                  <span className="grid size-6 place-items-center rounded-full bg-ink text-[10px] font-semibold text-bg">{n.split(" ").map((x) => x[0]).join("")}</span>
                  {n} <span className="text-ink-3">· {h}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const COLS = [
  { t: "A candidatar", h: "Vagas que você quer", c: "#2F6BFF", cards: [["Product Designer Sênior", "Nubank", "LinkedIn", "NU", "#A855F7"], ["Design Lead, Growth", "QuintoAndar", "Gupy", "QU", "#2F6BFF"]] },
  { t: "Candidatando", h: "Currículo e portfólio em preparo", c: "#E0A100", cards: [["UX Researcher Pleno", "Hotmart", "Gupy", "HO", "#14A37F"]] },
  { t: "Candidatura feita", h: "Enviada, aguardando retorno", c: "#14A37F", cards: [["Staff Product Designer", "Stone", "LinkedIn", "ST", "#E8501F"], ["Head de Design", "Creditas", "Gupy", "CR", "#E11D74"]] },
  { t: "Em processo", h: "Entrevistas e testes", c: "#A855F7", cards: [["Senior UX Designer", "iFood", "LinkedIn", "IF", "#DC2626"]] },
] as const;

function KanbanSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-wider text-accent uppercase">Kanban de candidaturas</p>
        <h2 className="font-display mt-3 text-4xl leading-[1.02] sm:text-6xl">Do radar à <em className="text-accent">candidatura feita</em>.</h2>
        <p className="mt-5 text-lg text-ink-2">Favoritou? A vaga cai no seu quadro. Arraste de &ldquo;A candidatar&rdquo; até &ldquo;Em processo&rdquo; e nunca mais perca o fio de onde você já se candidatou.</p>
      </div>

      <div className="relative mt-12">
        <div className="absolute inset-x-10 -top-4 h-32 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-3 shadow-pop sm:p-5">
          <div className="scroll-thin -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 md:snap-none">
            {COLS.map((col, ci) => (
              <div key={col.t} className={`flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col rounded-3xl border bg-surface-2/60 p-3 md:w-0 md:max-w-none md:flex-1 ${ci === 2 ? "border-accent/60 bg-accent-soft/40" : "border-line"}`}>
                <div className="mb-3 flex items-start justify-between gap-2 px-1.5 pt-0.5">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold"><span className="size-2.5 rounded-full" style={{ background: col.c }} />{col.t}</p>
                    <p className="mt-0.5 text-xs text-ink-3">{col.h}</p>
                  </div>
                  <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-xs text-ink-2">{col.cards.length + (ci === 2 ? 1 : 0)}</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {col.cards.map(([title, company, src, ini, color]) => (
                    <div key={title} className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
                      <div className="flex gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl text-xs font-semibold text-white" style={{ background: color }}>{ini}</span>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm leading-snug font-semibold">{title}</p>
                          <p className="mt-0.5 truncate text-xs text-ink-2">{company}</p>
                        </div>
                      </div>
                      <span className="mt-3 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">{src}</span>
                    </div>
                  ))}

                  {/* cartão sendo arrastado para "Candidatura feita" */}
                  {ci === 2 && (
                    <div aria-hidden className="flex flex-col gap-2.5">
                      <div className="h-1 rounded-full bg-accent" />
                      <div className="rotate-2 rounded-2xl border border-accent bg-surface p-3.5 shadow-pop ring-4 ring-accent/15">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#0EA5C6] text-xs font-semibold text-white">LO</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">Product Designer Pleno</p>
                            <p className="truncate text-xs text-ink-2">Loft</p>
                          </div>
                          <GripVertical className="size-4 text-accent" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
