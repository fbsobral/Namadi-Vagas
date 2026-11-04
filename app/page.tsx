import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowUpRight, Bell, Bot, Check, ChevronDown, Copy, Funnel, GripVertical, History, Mail, RefreshCw, Search, Share2, ShieldCheck, Sparkles, Star,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { StickyCta } from "@/components/sticky-cta";

const STICKY_HIDE = ["topo-cta", "cta-final"];

export default async function Home() {
  const { userId } = await auth();
  const cta = userId ? { href: "/dashboard", label: "Abrir meu radar" } : { href: "/sign-up", label: "Criar meu radar" };

  return (
    <div className="relative z-10">
      <header className="pt-safe sticky top-0 z-30 border-b border-transparent bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-5">
          <Link href="/" aria-label="Namadi Vagas, início"><Logo /></Link>
          <nav aria-label="Seções" className="hidden items-center gap-1 text-sm text-ink-2 md:flex">
            {[["#como", "Como funciona"], ["#recursos", "Recursos"], ["#kanban", "Kanban"], ["#perguntas", "Perguntas"]].map(([h, l]) => (
              <a key={h} href={h} className="rounded-full px-3.5 py-2 transition hover:bg-surface-2 hover:text-ink">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 text-sm sm:gap-2">
            {!userId && <Link href="/sign-in" className="rounded-full px-3 py-2.5 text-ink-2 transition hover:text-ink sm:px-4">Entrar</Link>}
            <Link href={cta.href} className="rounded-full bg-ink px-4 py-2.5 font-medium text-bg transition hover:opacity-85 sm:px-5">{userId ? "Painel" : "Começar"}</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- hero ---------- */}
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-10 text-center sm:px-5 md:pt-20">
          <p className="anim-rise mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-2 shadow-card sm:mb-7">
            <span className="pulse-dot size-2 rounded-full bg-accent" /> Robô vigiando LinkedIn, Gupy e Google por você
          </p>
          <h1 className="font-display anim-rise mx-auto max-w-4xl text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.95]" style={{ animationDelay: ".06s" }}>
            A vaga certa <em className="text-accent">te encontra</em>, e as pessoas certas também.
          </h1>
          <p className="anim-rise mx-auto mt-6 max-w-xl text-base text-ink-2 sm:mt-7 sm:text-lg" style={{ animationDelay: ".12s" }}>
            Monte suas buscas (ou deixe a IA montar a partir do seu currículo), escolha a frequência e receba só o que é novo. Favoritou? Você ganha contatos no LinkedIn e um Kanban para acompanhar cada candidatura.
          </p>
          <div id="topo-cta" className="anim-rise mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:items-center" style={{ animationDelay: ".18s" }}>
            <Link href={cta.href} className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-4 font-medium text-accent-ink shadow-pop transition hover:-translate-y-0.5 hover:shadow-lg sm:py-3.5">
              {cta.label} <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a href="#como" className="rounded-full border border-line bg-surface px-6 py-4 font-medium transition hover:bg-surface-2 sm:py-3.5">Como funciona</a>
          </div>
          <ul className="anim-rise mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-ink-3" style={{ animationDelay: ".22s" }}>
            {["Até 30 buscas por conta", "De 30 min a semanal", "Resumo por e-mail", "Funciona no celular"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-accent" />{t}</li>
            ))}
          </ul>
        </section>

        <Preview />

        {/* ---------- como funciona ---------- */}
        <section id="como" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-5 sm:pt-28">
          <SectionHead kicker="Como funciona" title={<>Três passos e o radar <em className="text-accent">roda sozinho</em>.</>}
            text="Você configura uma vez. Depois é só abrir o painel (ou o e-mail) para ver o que chegou." />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { i: Search, t: "Diga o que procura", d: "Cargos combinados com E/OU, local, fontes e o que excluir. Ou envie o currículo e a IA sugere a busca pronta para você revisar." },
              { i: Bot, t: "O robô vigia por você", d: "Na frequência que você escolher, ele lê LinkedIn, Gupy e o Google, descarta repetidas e marca como NOVA só o que é inédito." },
              { i: Star, t: "Favorite e avance", d: "Cada favorita ganha recrutadores, lideranças e pessoas do time para conhecer, e entra no seu Kanban de candidaturas." },
            ].map(({ i: Icon, t, d }, n) => (
              <li key={t} className="relative rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-7">
                <div className="mb-8 flex items-center justify-between sm:mb-10">
                  <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="size-5" /></span>
                  <span className="font-mono text-xs text-ink-3">passo 0{n + 1}</span>
                </div>
                <h3 className="font-display text-3xl">{t}</h3>
                <p className="mt-3 text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- recursos ---------- */}
        <section id="recursos" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-5 sm:pt-28">
          <SectionHead kicker="Recursos" title={<>Tudo que você precisa para <em className="text-accent">não perder vaga</em>.</>}
            text="Do primeiro filtro à mensagem para o recrutador, sem planilha nem dez abas abertas." />

          <div className="mt-12 grid gap-4 md:grid-cols-6">
            <Feature className="md:col-span-4" icon={Search} title="Buscas sob medida" text="Agrupe termos com E/OU, escolha se cada grupo procura no título ou também na descrição, defina cidade ou remoto e a janela de publicação (24 h, 7 dias, 30 dias).">
              <div className="mt-6 space-y-2 rounded-2xl bg-surface-2 p-4 font-mono text-[12.5px] leading-relaxed text-ink-2">
                <p className="flex flex-wrap items-center gap-1.5">
                  <Chip>Product Designer</Chip><Op>OU</Op><Chip>UX Designer</Chip><Op strong>E</Op><Chip>sênior</Chip>
                </p>
                <p className="flex flex-wrap items-center gap-1.5"><span className="text-ink-3">sem no título:</span><Chip muted>estágio</Chip><Chip muted>júnior</Chip></p>
                <p className="flex flex-wrap items-center gap-1.5"><span className="text-ink-3">onde:</span><Chip>LinkedIn</Chip><Chip>Gupy</Chip><Chip>Google aberto</Chip></p>
              </div>
            </Feature>

            <Feature className="md:col-span-2" icon={Sparkles} title="Preencha com seu CV" text="Envie PDF, DOCX ou TXT e a IA sugere cargos em português e inglês, senioridade, exclusões e local. Você revisa antes de criar.">
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-ok-soft px-3 py-1.5 text-xs font-medium text-ok"><ShieldCheck className="size-4" /> O currículo é lido e descartado</p>
            </Feature>

            <Feature className="md:col-span-2" icon={RefreshCw} title="Na sua frequência" text="De 30 minutos a uma vez por semana, ou minutos personalizados. Quer agora? “Rodar agora”. Pause e retome quando quiser.">
              <div className="mt-5 flex flex-wrap gap-1.5 text-xs">
                {["30 min", "1 h", "6 h", "Diária", "Semanal"].map((f, i) => (
                  <span key={f} className={`rounded-lg border px-2.5 py-1 ${i === 2 ? "border-accent bg-accent-soft font-medium text-accent" : "border-line text-ink-2"}`}>{f}</span>
                ))}
              </div>
            </Feature>

            <Feature className="md:col-span-2" icon={History} title="Robô transparente" text="Selo de robô online, histórico de cada rodada com o que foi encontrado e nova tentativa automática se algo falhar.">
              <ul className="mt-5 space-y-1.5 text-xs text-ink-2">
                {[["hoje 14:00", "3 novas", true], ["hoje 08:00", "nada novo", false], ["ontem 20:00", "5 novas", true]].map(([t, r, ok]) => (
                  <li key={t as string} className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${ok ? "bg-ok" : "bg-ink-3"}`} /><span className="font-mono text-ink-3">{t}</span><span className="ml-auto">{r}</span></li>
                ))}
              </ul>
            </Feature>

            <Feature className="md:col-span-2" icon={Funnel} title="Filtro que não esconde" text="Vagas barradas pela descrição vão para a aba Filtradas, com o motivo. Discordou? “Manter na lista” e pronto: nada é apagado." />

            <Feature className="md:col-span-3" icon={Mail} title="Resumo por e-mail" text="A cada rodada com vaga nova ou um resumo diário às 8h, por busca. Tem e-mail de teste e link para parar de receber em cada envio.">
              <div className="mt-5 rounded-2xl border border-line bg-bg/60 p-3.5 text-sm">
                <p className="flex items-center gap-2 text-xs text-ink-3"><Bell className="size-3.5 text-accent" /> Namadi Vagas · 08:00</p>
                <p className="mt-1 font-medium">4 vagas novas em “Product Design”</p>
                <p className="truncate text-xs text-ink-3">Product Designer Sênior · Nubank, Design Lead · QuintoAndar…</p>
              </div>
            </Feature>

            <Feature className="md:col-span-3" icon={Share2} title="Busque junto" text="Compartilhe uma busca por e-mail com quem também está procurando. Cada pessoa tem suas favoritas, seu Kanban e escolhe como receber os e-mails. Só você edita a busca.">
              <div className="mt-5 flex items-center">
                {["MA", "RC", "CD"].map((n, i) => (
                  <span key={n} className="-ml-2 grid size-9 place-items-center rounded-full border-2 border-surface text-xs font-semibold text-white first:ml-0" style={{ background: ["#2F6BFF", "#14A37F", "#A855F7"][i] }}>{n}</span>
                ))}
                <span className="ml-3 text-sm text-ink-2">seguindo “Design Lead”</span>
              </div>
            </Feature>
          </div>
        </section>

        <PeopleSection />

        <KanbanSection />

        {/* ---------- celular ---------- */}
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-5 sm:pt-28">
          <div className="grid items-center gap-10 overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-card sm:p-10 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium tracking-wider text-accent uppercase">No bolso</p>
              <h2 className="font-display mt-3 text-4xl leading-[1.02] sm:text-5xl">Feito para o <em className="text-accent">celular</em> também.</h2>
              <p className="mt-4 text-ink-2">Menu lateral vira gaveta, formulários abrem como folha de baixo para cima e o Kanban desliza coluna por coluna. Adicione à tela de início e abra o radar como um app.</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
                {["Botões grandes, pensados para o dedo", "Guias rápidos em cada tela, com o botão “?”", "Mova cartões do Kanban pelo seletor, sem arrastar"].map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-accent" />{t}</li>
                ))}
              </ul>
            </div>
            <Phone />
          </div>
        </section>

        {/* ---------- perguntas ---------- */}
        <section id="perguntas" className="mx-auto max-w-3xl scroll-mt-24 px-4 pt-24 pb-24 sm:px-5 sm:pt-28">
          <SectionHead kicker="Perguntas" title={<>Antes de <em className="text-accent">começar</em>.</>} />
          <div className="mt-10 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-5 py-4 font-medium transition hover:bg-surface-2/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{q}</span>
                  <ChevronDown className="size-5 shrink-0 text-ink-3 transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-ink-2 sm:px-6">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------- chamada final ---------- */}
        <section id="cta-final" className="relative isolate overflow-hidden bg-accent text-accent-ink">
          <svg aria-hidden className="pointer-events-none absolute -top-40 -right-40 -z-10 size-[620px] opacity-60" viewBox="0 0 600 600">
            {[280, 210, 140, 70].map((r) => <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="currentColor" strokeOpacity=".22" />)}
            <g style={{ transformOrigin: "300px 300px", animation: "spin 9s linear infinite" }}>
              <path d="M300 300 L300 20 A280 280 0 0 1 560 190 Z" fill="currentColor" fillOpacity=".14" />
            </g>
          </svg>
          <svg aria-hidden className="pointer-events-none absolute -bottom-52 -left-40 -z-10 size-[460px] opacity-40" viewBox="0 0 600 600">
            {[280, 200, 120].map((r) => <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="currentColor" strokeOpacity=".22" />)}
          </svg>

          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-5 sm:py-28">
            <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.98]">
              Sua próxima vaga já foi publicada. <em className="opacity-80">Falta o robô te avisar.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg opacity-85">Crie sua primeira busca em um minuto. Um tour rápido te mostra o resto assim que você entrar.</p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href={cta.href} className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-8 py-4 font-medium text-bg shadow-pop transition hover:-translate-y-0.5">
                {cta.label} <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              {!userId && <Link href="/sign-in" className="rounded-full border border-current/40 px-7 py-4 font-medium transition hover:bg-black/10">Já tenho conta</Link>}
            </div>
          </div>
        </section>
      </main>

      <footer className={`mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${userId ? "" : "pb-28 sm:pb-10"}`}>
        <span>© {new Date().getFullYear()} Namadi Vagas</span>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
          <a href="#como" className="hover:text-ink">Como funciona</a>
          <a href="#recursos" className="hover:text-ink">Recursos</a>
          <a href="#perguntas" className="hover:text-ink">Perguntas</a>
          {!userId && <Link href="/sign-in" className="hover:text-ink">Entrar</Link>}
        </nav>
      </footer>

      {/* celular: chamada fixa no rodapé da tela para quem ainda não tem conta */}
      {!userId && <StickyCta href="/sign-up" label="Criar meu radar" hideWhen={STICKY_HIDE} />}
    </div>
  );
}

const FAQ: [string, string][] = [
  ["De onde vêm as vagas?", "LinkedIn e Gupy são lidos diretamente. O “Google aberto” alcança qualquer outro site com página de vaga, como páginas de carreira de empresas. Você escolhe as fontes em cada busca."],
  ["Com que frequência o robô procura?", "Você escolhe por busca: a cada 30 minutos, 1, 3, 6 ou 12 horas, diária, semanal ou um número de minutos. Também dá para rodar na hora com “Rodar agora”."],
  ["Vou receber vaga repetida?", "Não. O robô lembra o que já encontrou e só grava vagas inéditas, que aparecem com o selo NOVA até você abrir."],
  ["Como funciona a parte dos contatos?", "Ao favoritar uma vaga, o robô procura perfis públicos do LinkedIn ligados à empresa e separa em recrutamento, liderança e pessoas do time, cada um com uma mensagem sugerida para copiar."],
  ["Meu currículo fica guardado?", "Não. Quando você usa “Preencher com meu currículo”, o arquivo é lido na hora para sugerir a busca e depois descartado. Nada é criado sem a sua confirmação."],
  ["Quem vê uma busca compartilhada?", "Só quem você convidar por e-mail e entrar com esse mesmo e-mail. Cada pessoa tem favoritas, Kanban e e-mails próprios; só quem criou a busca pode editá-la."],
  ["Dá para usar no celular?", "Sim. O painel foi pensado para telas pequenas e você pode adicioná-lo à tela de início para abrir como um app."],
];

function SectionHead({ kicker, title, text }: { kicker: string; title: React.ReactNode; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-medium tracking-wider text-accent uppercase">{kicker}</p>
      <h2 className="font-display mt-3 text-4xl leading-[1.02] sm:text-6xl">{title}</h2>
      {text && <p className="mt-5 text-base text-ink-2 sm:text-lg">{text}</p>}
    </div>
  );
}

function Feature({ icon: Icon, title, text, className = "", children }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; className?: string; children?: React.ReactNode }) {
  return (
    <article className={`min-w-0 rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-7 ${className}`}>
      <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="size-5" /></span>
      <h3 className="font-display mt-6 text-[1.9rem] leading-tight">{title}</h3>
      <p className="mt-2 text-ink-2">{text}</p>
      {children}
    </article>
  );
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={`rounded-full border px-2.5 py-0.5 ${muted ? "border-line text-ink-3 line-through decoration-accent/60" : "border-line bg-surface text-ink"}`}>{children}</span>;
}
function Op({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${strong ? "bg-ink text-bg" : "bg-accent-soft text-accent"}`}>{children}</span>;
}

function Preview() {
  const jobs = [
    { c: "Nubank", t: "Product Designer Sênior", m: "Remoto · Brasil", s: "LinkedIn", col: "#A855F7", fav: true, n: true },
    { c: "QuintoAndar", t: "Design Lead, Growth", m: "São Paulo, SP", s: "Google aberto", col: "#2F6BFF", n: true },
    { c: "Hotmart", t: "UX Researcher Pleno", m: "Belo Horizonte, MG", s: "Gupy", col: "#14A37F" },
  ];
  return (
    <div className="anim-rise relative mx-auto max-w-5xl px-4 sm:px-5" style={{ animationDelay: ".28s" }}>
      <div className="absolute inset-x-10 -top-6 h-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative grid grid-cols-1 overflow-hidden rounded-[28px] border border-line bg-surface shadow-pop md:grid-cols-[230px_1fr]">
        <aside className="hidden border-r border-line bg-surface-2/60 p-4 md:block">
          <p className="mb-3 px-2 text-[11px] font-medium tracking-wider text-ink-3 uppercase">Minhas buscas</p>
          {[["Product Design", "#E8501F", 12], ["UX Research · remoto", "#2F6BFF", 4], ["Design Lead", "#14A37F", 0]].map(([n, c, k], i) => (
            <div key={n as string} className={`mb-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm ${i === 0 ? "bg-surface shadow-card" : "text-ink-2"}`}>
              <span className="size-2.5 rounded-full" style={{ background: c as string }} /> <span className="truncate">{n}</span>
              {(k as number) > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-medium text-accent-ink">{k}</span>}
            </div>
          ))}
          <p className="mt-6 mb-2 px-2 text-[11px] font-medium tracking-wider text-ink-3 uppercase">Compartilhadas comigo</p>
          <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-ink-2"><span className="size-2.5 rounded-full bg-[#A855F7]" /><span className="truncate">Head de Produto</span></div>
        </aside>
        <div className="min-w-0 p-4 text-left sm:p-5 md:p-7">
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
            <div className="min-w-0">
              <p className="font-display text-2xl sm:text-3xl">Product Design</p>
              <p className="text-xs text-ink-3 sm:text-sm">a cada 6 horas · próxima rodada em 2h</p>
            </div>
            <span className="shrink-0 rounded-full bg-ok-soft px-3 py-1 text-xs font-medium text-ok">● robô ativo</span>
          </div>
          <div className="mb-4 flex gap-1 border-b border-line text-xs font-medium sm:text-sm">
            {["Todas", "Novas", "Favoritas", "Filtradas · 2"].map((t, i) => (
              <span key={t} className={`-mb-px shrink-0 border-b-2 px-2.5 py-2 sm:px-3 ${i === 0 ? "border-accent text-ink" : "border-transparent text-ink-3"} ${i === 3 ? "hidden sm:inline" : ""}`}>{t}</span>
            ))}
          </div>
          <div className="grid gap-2.5 sm:gap-3">
            {jobs.map((j) => (
              <div key={j.t} className="flex items-center gap-3 rounded-2xl border border-line bg-bg/60 p-3 sm:gap-4 sm:p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white sm:size-11" style={{ background: j.col }}>{j.c.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium sm:text-base">{j.t} {j.n && <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">NOVA</span>}</p>
                  <p className="truncate text-xs text-ink-3 sm:text-sm">{j.c} · {j.m} · {j.s}</p>
                </div>
                <Star className={`size-5 shrink-0 ${j.fav ? "fill-accent text-accent" : "text-ink-3"}`} />
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-accent/40 bg-accent-soft/50 p-3.5 sm:p-4">
            <p className="mb-3 text-xs font-medium tracking-wider text-accent uppercase">Pessoas para conhecer · Nubank</p>
            <div className="flex flex-wrap gap-2">
              {[["Marina Alves", "Talent Acquisition"], ["Rafael Costa", "Head de Design"], ["Camila Duarte", "Staff Designer"]].map(([n, h]) => (
                <span key={n} className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-1.5 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-semibold text-bg">{n.split(" ").map((x) => x[0]).join("")}</span>
                  <span className="truncate">{n} <span className="text-ink-3">· {h}</span></span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PeopleSection() {
  const groups = [
    { t: "Recrutamento & People", h: "Quem abre a porta", p: [["Marina Alves", "Talent Acquisition Partner", "#2F6BFF"]] },
    { t: "Liderança da área", h: "Quem decide e contrata", p: [["Rafael Costa", "Head de Design", "#14A37F"]] },
    { t: "Pessoas do time", h: "Quem conta como é por dentro", p: [["Camila Duarte", "Staff Product Designer", "#A855F7"]] },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-5 sm:pt-28">
      <div className="grid items-center gap-10 md:grid-cols-[1fr_1.1fr] md:gap-14">
        <div>
          <p className="text-xs font-medium tracking-wider text-accent uppercase">Pessoas, não só vagas</p>
          <h2 className="font-display mt-3 text-4xl leading-[1.02] sm:text-6xl">Favoritou? <em className="text-accent">Já sabe com quem falar.</em></h2>
          <p className="mt-5 text-base text-ink-2 sm:text-lg">O robô procura perfis públicos do LinkedIn ligados à empresa, filtra homônimos e separa por papel. Cada contato vem com uma mensagem curta, adaptada à vaga, pronta para copiar.</p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
            {["Descrição da vaga com seus termos destacados", "Link direto para o anúncio original", "“Buscar de novo” se a empresa ainda não tiver resultados"].map((t) => (
              <li key={t} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-accent" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute inset-x-6 -top-4 h-32 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative space-y-5 rounded-[28px] border border-line bg-surface p-4 shadow-pop sm:p-6">
            {groups.map((g, gi) => (
              <div key={g.t}>
                <p className="mb-2.5 flex flex-wrap items-baseline gap-x-2 text-sm"><strong className="font-semibold">{g.t}</strong><span className="text-xs text-ink-3">{g.h}</span></p>
                {g.p.map(([n, h, c]) => (
                  <div key={n} className="rounded-2xl border border-line bg-bg/60 p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: c }}>{n.split(" ").map((x) => x[0]).join("")}</span>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{n}</p><p className="truncate text-xs text-ink-2">{h}</p></div>
                    </div>
                    {gi === 0 && (
                      <>
                        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">“Olá Marina, tudo bem? Vi a vaga de Product Designer Sênior na Nubank e me interessei muito pelo desafio…”</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-medium">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0a66c2] px-3 py-1.5 text-white"><span className="rounded-[3px] bg-white px-[3px] text-[10px] leading-[14px] font-extrabold text-[#0a66c2]">in</span> Ver perfil</span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5"><Copy className="size-3.5" /> Copiar mensagem</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Phone() {
  return (
    <div className="relative mx-auto w-full max-w-[290px]">
      <div className="absolute inset-6 rounded-full bg-accent/25 blur-3xl" />
      <div className="relative rounded-[44px] border border-line bg-ink p-2.5 shadow-pop">
        <div className="overflow-hidden rounded-[36px] bg-bg">
          <div className="flex items-center justify-between border-b border-line px-4 pt-6 pb-3">
            <Logo size={20} />
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-2"><span className="size-1.5 rounded-full bg-ok" />online</span>
          </div>
          <div className="space-y-2 p-3">
            <p className="font-display px-1 text-2xl">Todas as vagas</p>
            {[["Product Designer Sênior", "Nubank", "#A855F7", true], ["UX Writer", "Stone", "#E8501F", false], ["Design Ops", "iFood", "#DC2626", false]].map(([t, c, col, f]) => (
              <div key={t as string} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-semibold text-white" style={{ background: col as string }}>{(c as string).slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{t}</p><p className="truncate text-[10px] text-ink-3">{c}</p></div>
                <Star className={`size-4 shrink-0 ${f ? "fill-accent text-accent" : "text-ink-3"}`} />
              </div>
            ))}
          </div>
          <div className="mx-3 mb-3 rounded-2xl border border-accent/30 bg-accent-soft/70 p-3">
            <p className="text-[11px] font-semibold">Primeira vez no Kanban?</p>
            <p className="mt-0.5 text-[10px] text-ink-2">Etapas, como mover as vagas e filtros.</p>
            <span className="mt-2 inline-flex rounded-full bg-ink px-2.5 py-1 text-[10px] font-medium text-bg">Ver como funciona</span>
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
    <section id="kanban" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-5 sm:pt-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-wider text-accent uppercase">Kanban de candidaturas</p>
        <h2 className="font-display mt-3 text-4xl leading-[1.02] sm:text-6xl">Do radar à <em className="text-accent">candidatura feita</em>.</h2>
        <p className="mt-5 text-base text-ink-2 sm:text-lg">Favoritou? A vaga cai no seu quadro. Arraste de &ldquo;A candidatar&rdquo; até &ldquo;Em processo&rdquo; (ou &ldquo;Encerradas&rdquo;), filtre por busca ou empresa e nunca mais perca o fio de onde você já se candidatou. No celular, um seletor em cada cartão faz o mesmo sem arrastar.</p>
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
