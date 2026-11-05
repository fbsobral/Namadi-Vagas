// Mini-telas ilustrativas dos guias: reproduzem, em escala, as telas reais do app.
// São decorativas (aria-hidden) e animam só com CSS; com "reduzir movimento" ficam paradas.

import {
  ArrowUpRight, Bell, Check, CheckCheck, ChevronDown, Clock, Copy, FileText, LogOut, Mail, MapPin, MousePointer2, Pause, Pencil,
  RefreshCw, Search, Send, Share2, Sparkles, Star, Trash2, UserPlus, X,
} from "lucide-react";
import { Building2 } from "lucide-react";
import type { VisualKey } from "@/lib/onboarding";
import { Bar, ScoreRing } from "./score-ring";

/* ---------- peças ---------- */

const d = (s: number) => ({ animationDelay: `${s}s` });

function Frame({ children, radar = false }: { children: React.ReactNode; radar?: boolean }) {
  return (
    <div className="relative grid h-52 place-items-center overflow-hidden rounded-3xl bg-accent-soft/60 px-4 sm:h-56">
      <svg aria-hidden className="pointer-events-none absolute size-[340px] text-accent" viewBox="0 0 300 300">
        {[140, 105, 70].map((r) => <circle key={r} cx="150" cy="150" r={r} fill="none" stroke="currentColor" strokeOpacity={radar ? ".22" : ".1"} />)}
        {radar && (
          <g style={{ transformOrigin: "150px 150px", animation: "spin 5s linear infinite" }}>
            <path d="M150 150 L150 10 A140 140 0 0 1 271 80 Z" fill="currentColor" fillOpacity=".14" />
          </g>
        )}
      </svg>
      <div className="relative w-full max-w-[310px]">{children}</div>
    </div>
  );
}

function Screen({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`anim-pop rounded-2xl border border-line bg-surface p-3 text-left shadow-pop ${className}`} style={style}>{children}</div>;
}

function Av({ t, c, s = 28 }: { t: string; c: string; s?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-lg text-[10px] font-semibold text-white" style={{ background: c, width: s, height: s }}>{t}</span>;
}

function Person({ t, c, s = 26 }: { t: string; c: string; s?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: c, width: s, height: s }}>{t}</span>;
}

function Chip({ children, on, muted, className = "" }: { children: React.ReactNode; on?: boolean; muted?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] whitespace-nowrap ${on ? "border-ink bg-ink text-bg" : muted ? "border-line text-ink-3" : "border-line bg-surface text-ink"} ${className}`}>{children}</span>
  );
}

function Op({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <span className={`rounded px-1 py-px text-[9px] font-bold ${strong ? "bg-ink text-bg" : "bg-accent-soft text-accent"}`}>{children}</span>;
}

function Btn({ children, primary, className = "", style }: { children: React.ReactNode; primary?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium whitespace-nowrap ${primary ? "bg-ink text-bg" : "border border-line bg-surface text-ink"} ${className}`} style={style}>{children}</span>
  );
}

function JobRow({ t, c, a, col, star, nova, delay = 0 }: { t: string; c: string; a: string; col: string; star?: boolean; nova?: boolean; delay?: number }) {
  return (
    <div className="anim-pop flex items-center gap-2 rounded-xl border border-line bg-bg/70 p-2" style={d(delay)}>
      <Av t={a} c={col} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[11px] font-semibold">{t}{nova && <span className="rounded-full bg-accent px-1 text-[8px] font-bold text-accent-ink">NOVA</span>}</p>
        <p className="truncate text-[9.5px] text-ink-3">{c}</p>
      </div>
      <Star className={`size-3.5 shrink-0 ${star ? "anim-star fill-accent text-accent" : "text-ink-3"}`} style={star ? d(delay + 0.5) : undefined} />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[9px] font-semibold tracking-wider text-ink-3 uppercase">{children}</p>;
}

/* ---------- telas ---------- */

const V: Record<VisualKey, () => React.ReactNode> = {
  radar: () => (
    <Frame radar>
      <div className="relative h-40">
        {[["18%", "22%", 0.3], ["74%", "30%", 0.9], ["60%", "78%", 1.5]].map(([l, t, s]) => (
          <span key={l as string} className="pulse-dot absolute size-2.5 rounded-full bg-accent" style={{ left: l as string, top: t as string, ...d(s as number) }} />
        ))}
        <Screen className="absolute top-2 left-0 w-[58%] !p-2" style={d(0.4)}>
          <div className="flex items-center gap-1.5"><Av t="NU" c="#A855F7" s={22} /><div className="min-w-0"><p className="truncate text-[10px] font-semibold">Product Designer</p><p className="text-[8.5px] text-accent">NOVA · agora</p></div></div>
        </Screen>
        <Screen className="absolute right-0 bottom-2 w-[58%] !p-2" style={d(1)}>
          <div className="flex items-center gap-1.5"><Av t="QU" c="#2F6BFF" s={22} /><div className="min-w-0"><p className="truncate text-[10px] font-semibold">UX Designer Sênior</p><p className="text-[8.5px] text-accent">NOVA · há 2 min</p></div></div>
        </Screen>
      </div>
    </Frame>
  ),

  searchForm: () => (
    <Frame>
      <Screen>
        <p className="text-[9px] font-semibold tracking-wider text-accent uppercase">Nova busca</p>
        <p className="font-display text-xl leading-tight">O que você procura?</p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Chip>Product Designer</Chip><Op>OU</Op><Chip>UX Designer</Chip>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-line bg-bg px-2 py-1 text-[10.5px]"><MapPin className="size-3 text-ink-3" /><span className="g-type">São Paulo, remoto</span></div>
        <div className="mt-2 flex flex-wrap gap-1"><Chip on><Check className="size-2.5" />LinkedIn</Chip><Chip on><Check className="size-2.5" />Gupy</Chip><Chip muted>Google aberto</Chip></div>
      </Screen>
    </Frame>
  ),

  robot: () => (
    <Frame>
      <Screen>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0"><p className="font-display truncate text-lg leading-tight">Product Design</p><p className="text-[9.5px] text-ink-3">a cada 6 horas · próxima em 2h</p></div>
          <span className="shrink-0 rounded-full bg-ok-soft px-2 py-0.5 text-[9px] font-medium text-ok">● online</span>
        </div>
        <Btn primary className="mt-2"><RefreshCw className="spin size-3" /> Buscando…</Btn>
        <ul className="mt-2.5 space-y-1 text-[10px]">
          {[["agora", "+3 novas", true], ["há 6 h", "nada novo", false], ["há 12 h", "+5 novas", true]].map(([t, r, ok], n) => (
            <li key={t as string} className="anim-pop flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1" style={d(0.3 + n * 0.15)}><span className={`size-1.5 rounded-full ${ok ? "bg-ok" : "bg-ink-3"}`} /><span className="font-mono text-ink-3">{t}</span><span className={`ml-auto ${ok ? "font-medium text-ok" : "text-ink-3"}`}>{r}</span></li>
          ))}
        </ul>
      </Screen>
    </Frame>
  ),

  favContacts: () => (
    <Frame>
      <div className="space-y-2">
        <JobRow t="Product Designer Sênior" c="Nubank · Remoto" a="NU" col="#A855F7" star />
        <Screen className="border-dashed !border-accent/40 !bg-accent-soft/80 !shadow-none" style={d(0.7)}>
          <Label>Pessoas para conhecer · Nubank</Label>
          <div className="flex flex-wrap gap-1">
            {[["MA", "Marina · Recrutadora", "#2F6BFF"], ["RC", "Rafael · Head", "#14A37F"], ["CD", "Camila · Time", "#A855F7"]].map(([i, n, c], k) => (
              <span key={i} className="anim-pop inline-flex items-center gap-1 rounded-full border border-line bg-surface py-0.5 pr-2 pl-0.5 text-[10px]" style={d(1 + k * 0.2)}><Person t={i} c={c} s={18} />{n}</span>
            ))}
          </div>
        </Screen>
      </div>
    </Frame>
  ),

  kanban: () => <KanbanMini />,

  emailShare: () => (
    <Frame>
      <div className="space-y-2">
        <Screen className="!p-2.5">
          <p className="flex items-center gap-1.5 text-[9.5px] text-ink-3"><Bell className="size-3 text-accent" /> Namadi Vagas · 08:00</p>
          <p className="mt-0.5 text-[11.5px] font-semibold">4 vagas novas em “Product Design”</p>
          <p className="truncate text-[9.5px] text-ink-3">Product Designer Sênior · Nubank, Design Lead…</p>
        </Screen>
        <Screen className="flex items-center gap-2 !p-2.5" style={d(0.5)}>
          <Share2 className="size-3.5 text-accent" />
          <div className="flex">{[["MA", "#2F6BFF"], ["RC", "#14A37F"], ["CD", "#A855F7"]].map(([t, c]) => <span key={t} className="-ml-1.5 rounded-full ring-2 ring-surface first:ml-0"><Person t={t} c={c} s={22} /></span>)}</div>
          <span className="text-[10.5px] text-ink-2">seguindo esta busca</span>
        </Screen>
      </div>
    </Frame>
  ),

  phone: () => (
    <Frame>
      <div className="mx-auto w-36 rounded-[26px] bg-ink p-1.5 shadow-pop">
        <div className="rounded-[20px] bg-bg px-3 pt-5 pb-4">
          <div className="grid grid-cols-3 gap-2.5">
            {["#2F6BFF", "#14A37F", null, "#E0A100", "#A855F7", "#E11D74"].map((c, i) => c
              ? <span key={i} className="aspect-square rounded-xl opacity-40" style={{ background: c }} />
              : (
                <span key={i} className="anim-pop flex flex-col items-center gap-0.5" style={d(0.4)}>
                  <svg viewBox="0 0 32 32" className="aspect-square w-full"><rect width="32" height="32" rx="9" fill="var(--ink)" /><circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--bg)" strokeOpacity=".35" strokeWidth="1.5" /><path d="M16 16 L24.5 9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /><circle cx="16" cy="16" r="2" fill="var(--accent)" /></svg>
                  <span className="text-[6.5px] leading-none font-medium">Namadi</span>
                </span>
              ))}
          </div>
          <p className="mt-3 rounded-full bg-surface px-2 py-1 text-center text-[7.5px] font-medium text-ink-2 shadow-card">Adicionar à Tela de Início</p>
        </div>
      </div>
    </Frame>
  ),

  cv: () => (
    <Frame>
      <Screen>
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-bg/60 p-2">
          <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent"><FileText className="size-3.5" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-medium">curriculo-ana.pdf</p><div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"><span className="g-bar block h-full rounded-full bg-accent" /></div></div>
        </div>
        <p className="anim-pop mt-2.5 flex items-center gap-1 text-[10px] font-medium text-accent" style={d(1.2)}><Sparkles className="size-3" /> Sugestão da IA</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {["Product Designer", "UX Designer", "sênior", "−estágio", "São Paulo"].map((t, i) => (
            <span key={t} className="anim-pop" style={d(1.4 + i * 0.12)}><Chip muted={t.startsWith("−")}>{t}</Chip></span>
          ))}
        </div>
        <p className="anim-pop mt-2 text-[9px] text-ok" style={d(2.1)}>✓ arquivo lido e descartado</p>
      </Screen>
    </Frame>
  ),

  groups: () => (
    <Frame>
      <Screen className="space-y-1.5">
        {[
          { n: 1, op: "OU", terms: ["Product Designer", "UX Designer"], scope: "Título e descrição" },
          { n: 2, op: "E", terms: ["sênior"], scope: "Só título" },
        ].map((g, k) => (
          <div key={g.n} className="anim-pop rounded-xl border border-line bg-surface-2/70 p-2" style={d(k * 0.3)}>
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span className="text-[8.5px] font-semibold tracking-wider text-ink-3 uppercase">Grupo {g.n}</span>
              <span className="rounded-full bg-ink px-1.5 py-px text-[8.5px] font-medium text-bg">{g.scope}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">{g.terms.map((t, i) => <span key={t} className="contents">{i > 0 && <Op>{g.op}</Op>}<Chip>{t}</Chip></span>)}</div>
          </div>
        ))}
        <p className="anim-pop flex items-center justify-center gap-1 text-[10px] text-ink-3" style={d(0.7)}>entre grupos <Op strong>E</Op></p>
      </Screen>
    </Frame>
  ),

  exclude: () => (
    <Frame>
      <div className="space-y-2">
        <Screen className="!p-2.5">
          <p className="mb-1 text-[10px] font-medium">Não pode conter no título</p>
          <div className="flex gap-1"><Chip muted className="line-through decoration-accent">estágio</Chip><Chip muted className="line-through decoration-accent">júnior</Chip></div>
        </Screen>
        <Screen className="!p-2.5" style={d(0.4)}>
          <div className="mb-2 flex gap-2 border-b border-line text-[10px]"><span className="pb-1 text-ink-3">Todas</span><span className="pb-1 text-ink-3">Novas</span><span className="-mb-px border-b-2 border-accent pb-1 font-medium">Filtradas · 2</span></div>
          <p className="text-[11px] font-semibold">Designer Pleno · Stone</p>
          <p className="text-[9.5px] text-accent">filtrada: descrição contém “PJ”</p>
          <Btn className="anim-pop mt-1.5" style={d(0.9)}><Check className="size-3" /> Manter na lista</Btn>
        </Screen>
      </div>
    </Frame>
  ),

  sources: () => (
    <Frame>
      <Screen className="space-y-2.5">
        <div><p className="mb-1 text-[10px] font-medium">Onde o robô procura</p><div className="flex flex-wrap gap-1"><Chip on><Check className="size-2.5" />LinkedIn</Chip><Chip on><Check className="size-2.5" />Gupy</Chip><Chip>Google aberto</Chip></div></div>
        <div><p className="mb-1 text-[10px] font-medium">Publicadas nos últimos</p>
          <div className="inline-flex rounded-lg border border-line bg-bg p-0.5 text-[10px]">{["24 h", "7 dias", "30 dias", "Qualquer"].map((t, i) => <span key={t} className={`rounded-md px-1.5 py-0.5 ${i === 1 ? "bg-surface font-medium shadow-card" : "text-ink-3"}`}>{t}</span>)}</div>
        </div>
        <div><p className="mb-1 flex items-center gap-1 text-[10px] font-medium"><Clock className="size-3 text-accent" /> Frequência do robô</p>
          <div className="flex flex-wrap gap-1 text-[10px]">{["30 min", "1 h", "6 h", "Diária", "Semanal"].map((t, i) => <span key={t} className={`rounded-md border px-1.5 py-0.5 ${i === 2 ? "border-accent bg-accent-soft font-medium text-accent" : "border-line text-ink-2"}`}>{t}</span>)}</div>
        </div>
      </Screen>
    </Frame>
  ),

  emailPreview: () => (
    <Frame>
      <Screen className="space-y-2">
        <p className="flex items-center gap-1 text-[10px] font-medium"><Mail className="size-3 text-accent" /> Resumo por e-mail</p>
        <div className="inline-flex rounded-lg border border-line bg-bg p-0.5 text-[10px]">{["Desligado", "A cada rodada", "Diário (8h)"].map((t, i) => <span key={t} className={`rounded-md px-1.5 py-0.5 ${i === 2 ? "bg-surface font-medium shadow-card" : "text-ink-3"}`}>{t}</span>)}</div>
        <div className="anim-pop space-y-1 rounded-xl bg-surface-2 p-2" style={d(0.4)}>
          <p className="text-[8.5px] font-semibold tracking-wider text-ink-3 uppercase">O que o robô vai buscar</p>
          <p className="font-mono text-[9.5px] leading-snug break-words text-ink-2"><span className="mr-1 rounded-full bg-surface px-1 text-[8px] font-semibold text-ink-3">LinkedIn</span>(&quot;Product Designer&quot; OR &quot;UX Designer&quot;) sênior</p>
        </div>
        <Btn className="anim-pop" style={d(0.8)}><Send className="size-3" /> Enviar e-mail de teste</Btn>
      </Screen>
    </Frame>
  ),

  tabs: () => (
    <Frame>
      <Screen>
        <p className="font-display text-lg leading-tight">Todas as vagas</p>
        <div className="mt-1.5 mb-2 flex gap-2.5 border-b border-line text-[10.5px]">
          {["Todas", "Novas", "Favoritas", "Filtradas"].map((t, i) => <span key={t} className={`-mb-px pb-1 ${i === 1 ? "border-b-2 border-accent font-medium" : "text-ink-3"}`}>{t}</span>)}
        </div>
        <div className="space-y-1.5">
          <JobRow t="Product Designer Sênior" c="Nubank · LinkedIn" a="NU" col="#A855F7" nova delay={0.2} />
          <JobRow t="Design Lead, Growth" c="QuintoAndar · Gupy" a="QU" col="#2F6BFF" nova delay={0.35} />
        </div>
      </Screen>
    </Frame>
  ),

  newBadge: () => (
    <Frame>
      <Screen>
        <div className="mb-2 flex items-center justify-between"><p className="font-display text-lg leading-tight">Product Design</p><Btn className="g-press"><CheckCheck className="size-3" /> Marcar vistas</Btn></div>
        <div className="space-y-1.5">
          {[["UX Researcher", "Hotmart", "HO", "#14A37F"], ["Design Ops", "iFood", "IF", "#DC2626"]].map(([t, c, a, col], k) => (
            <div key={t} className="flex items-center gap-2 rounded-xl border border-line bg-bg/70 p-2">
              <Av t={a} c={col} />
              <div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-[11px] font-semibold">{t}<span className="g-fade-out rounded-full bg-accent px-1 text-[8px] font-bold text-accent-ink" style={d(k * 0.1)}>NOVA</span></p><p className="text-[9.5px] text-ink-3">{c}</p></div>
            </div>
          ))}
        </div>
      </Screen>
    </Frame>
  ),

  toolbar: () => (
    <Frame>
      <Screen>
        <p className="font-display text-lg leading-tight">Product Design</p>
        <p className="text-[9.5px] text-ink-3">robô ativo · a cada 6 horas</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Btn primary><RefreshCw className="size-3" /> Rodar agora</Btn>
          {[[Pause, "Pausar"], [Pencil, "Editar"], [Share2, "Compartilhar"]].map(([I, l], k) => {
            const Icon = I as typeof Pause;
            return <Btn key={l as string} className="anim-pop" style={d(0.15 + k * 0.12)}><Icon className="size-3" /> {l as string}</Btn>;
          })}
          <Btn className="anim-pop text-ink-3" style={d(0.6)}><Trash2 className="size-3" /></Btn>
        </div>
        <div className="mt-2.5 flex items-end gap-1" aria-hidden>
          {[3, 0, 5, 1, 2, 0, 4].map((n, i) => <span key={i} className="anim-pop w-full rounded-sm bg-accent/70" style={{ height: 6 + n * 5, ...d(0.4 + i * 0.06), opacity: n ? 1 : 0.25 }} />)}
        </div>
        <p className="mt-1 text-[8.5px] text-ink-3">histórico das últimas rodadas</p>
      </Screen>
    </Frame>
  ),

  jobDetail: () => (
    <Frame>
      <Screen>
        <div className="flex items-center gap-2"><Av t="NU" c="#A855F7" s={32} /><div className="min-w-0"><p className="font-display truncate text-lg leading-tight">Product Designer Sênior</p><p className="flex items-center gap-1 text-[9.5px] text-ink-2"><strong className="font-medium text-ink">Nubank</strong><MapPin className="size-2.5" />Remoto</p></div></div>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-2">Buscamos <mark className="rounded bg-accent-soft px-0.5 text-accent">Product Designer</mark> com experiência <mark className="rounded bg-accent-soft px-0.5 text-accent">sênior</mark> em produtos digitais, pesquisa e design system…</p>
        <div className="mt-2 flex gap-1"><Btn primary>Abrir vaga <ArrowUpRight className="size-3" /></Btn><Btn><Star className="size-3" /> Favoritar</Btn></div>
      </Screen>
    </Frame>
  ),

  contactGroups: () => (
    <Frame>
      <Screen className="space-y-2">
        {[["Recrutamento & People", "MA", "Marina Alves", "#2F6BFF"], ["Liderança da área", "RC", "Rafael Costa", "#14A37F"], ["Pessoas do time", "CD", "Camila Duarte", "#A855F7"]].map(([g, i, n, c], k) => (
          <div key={g} className="anim-pop" style={d(k * 0.25)}>
            <p className="mb-1 text-[9.5px] font-semibold">{g}</p>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/70 px-2 py-1.5">
              <Person t={i} c={c} s={22} /><span className="flex-1 truncate text-[10.5px] font-medium">{n}</span>
              <span className="rounded bg-[#0a66c2] px-1 text-[8px] font-extrabold text-white">in</span>
            </div>
          </div>
        ))}
      </Screen>
    </Frame>
  ),

  message: () => (
    <Frame>
      <Screen>
        <div className="flex items-center gap-2"><Person t="MA" c="#2F6BFF" s={30} /><div><p className="flex items-center gap-1 text-[11px] font-semibold">Marina Alves <span className="rounded-full bg-accent-soft px-1 text-[8px] font-bold text-accent uppercase">Recrutadora</span></p><p className="text-[9.5px] text-ink-3">Talent Acquisition · Nubank</p></div></div>
        <p className="anim-pop mt-2 rounded-xl rounded-tl-sm bg-surface-2 px-2.5 py-2 text-[10px] leading-relaxed text-ink-2" style={d(0.3)}>Olá Marina, tudo bem? Vi a vaga de Product Designer Sênior na Nubank e me interessei muito pelo desafio…</p>
        <div className="mt-2 flex gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0a66c2] px-2 py-1 text-[10px] font-medium text-white"><span className="rounded-[2px] bg-white px-[2px] text-[8px] leading-[11px] font-extrabold text-[#0a66c2]">in</span> Ver perfil</span>
          <span className="relative inline-flex items-center rounded-full border border-line px-2 py-1 text-[10px] font-medium">
            <span className="g-swap-a inline-flex items-center gap-1"><Copy className="size-3" /> Copiar mensagem</span>
            <span className="g-swap-b absolute inset-0 inline-flex items-center justify-center gap-1 text-ok"><Check className="size-3" /> Copiada</span>
          </span>
        </div>
      </Screen>
    </Frame>
  ),

  kanbanMove: () => <KanbanMini select />,

  boardFilter: () => (
    <Frame>
      <Screen className="space-y-2">
        <div className="flex gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[10px] font-medium whitespace-nowrap">Todas as buscas <ChevronDown className="size-3" /></span>
          <span className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-accent px-2 py-1 text-[10px] ring-2 ring-accent/15"><Search className="size-3 text-ink-3" /><span className="g-type">nubank</span></span>
        </div>
        <p className="text-[9px] text-ink-3">1 de 6 vagas</p>
        <div className="rounded-xl border border-line bg-surface-2/60 p-2">
          <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold"><span className="size-2 rounded-full bg-[#14A37F]" />Candidatura feita</p>
          <div className="anim-pop flex items-center gap-2 rounded-lg border border-line bg-surface p-1.5" style={d(0.9)}><Av t="NU" c="#A855F7" s={22} /><span className="truncate text-[10.5px] font-semibold">Product Designer Sênior</span></div>
        </div>
      </Screen>
    </Frame>
  ),

  invite: () => (
    <Frame>
      <Screen className="space-y-2">
        <p className="font-display text-lg leading-tight">Compartilhar “Design Lead”</p>
        <div className="flex gap-1.5">
          <span className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-line bg-bg px-2 py-1 text-[10.5px]"><Mail className="size-3 text-ink-3" /><span className="g-type">ana@email.com</span></span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 text-[10.5px] font-medium text-accent-ink"><UserPlus className="size-3" /> Convidar</span>
        </div>
        <div className="anim-pop flex items-center gap-2 rounded-xl border border-line px-2 py-1.5" style={d(1.4)}>
          <Person t="AN" c="#E0A100" s={22} /><div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-medium">ana@email.com</p><p className="text-[9px] text-ink-3">aguardando aceite</p></div>
          <Btn><Copy className="size-2.5" /> Link</Btn>
        </div>
      </Screen>
    </Frame>
  ),

  members: () => (
    <Frame>
      <div className="grid grid-cols-2 gap-2">
        {[["Você", "#2F6BFF", "VC", [true, false]], ["Ana", "#E0A100", "AN", [false, true]]].map(([n, c, i, stars], k) => (
          <Screen key={n as string} className="!p-2" style={d(k * 0.25)}>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold"><Person t={i as string} c={c as string} s={18} />{n as string}</p>
            {(stars as boolean[]).map((s, j) => (
              <div key={j} className="mb-1 flex items-center gap-1 rounded-lg border border-line bg-bg/70 p-1"><Av t={j ? "QU" : "NU"} c={j ? "#2F6BFF" : "#A855F7"} s={18} /><span className="flex-1 truncate text-[9px]">{j ? "Design Lead" : "Product Designer"}</span><Star className={`size-3 ${s ? "fill-accent text-accent" : "text-ink-3"}`} /></div>
            ))}
            <p className="text-[8.5px] text-ink-3">Kanban próprio</p>
          </Screen>
        ))}
      </div>
    </Frame>
  ),

  owner: () => (
    <Frame>
      <Screen className="space-y-1.5">
        <Label>Pessoas com acesso</Label>
        {[["AN", "Ana Souza", "#E0A100"], ["BR", "Bruno Lima", "#14A37F"]].map(([i, n, c], k) => (
          <div key={i} className={`flex items-center gap-2 rounded-xl border border-line px-2 py-1.5 ${k === 1 ? "g-remove" : ""}`}>
            <Person t={i} c={c} s={22} /><span className="flex-1 truncate text-[10.5px] font-medium">{n}</span>
            <span className={`grid size-5 place-items-center rounded-full ${k === 1 ? "bg-accent-soft text-accent" : "text-ink-3"}`}><X className="size-3" /></span>
          </div>
        ))}
        <p className="flex items-center gap-1 pt-1 text-[9.5px] text-ink-3"><Pencil className="size-3" /> Cada pessoa com o nível que você escolher.</p>
      </Screen>
    </Frame>
  ),

  sharedBanner: () => (
    <Frame>
      <Screen>
        <p className="flex items-center gap-1.5 text-[9.5px] text-ink-3"><span className="size-2 rounded-full bg-[#A855F7]" />compartilhada</p>
        <p className="font-display text-lg leading-tight">Head de Produto</p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-1 text-[10px] text-accent">Compartilhada por <strong>Ana</strong></span>
        <div className="mt-2 space-y-1.5">
          <JobRow t="Head of Product" c="Creditas · LinkedIn" a="CR" col="#E11D74" nova delay={0.3} />
        </div>
      </Screen>
    </Frame>
  ),

  notifySelect: () => (
    <Frame>
      <Screen className="space-y-1.5">
        <Btn><Mail className="size-3" /> E-mail: resumo diário (8h) <ChevronDown className="size-3" /></Btn>
        <div className="anim-pop overflow-hidden rounded-xl border border-line text-[10.5px] shadow-card" style={d(0.3)}>
          {["a cada rodada", "resumo diário (8h)", "desligado"].map((t, i) => (
            <p key={t} className={`flex items-center gap-1.5 px-2.5 py-1.5 ${i === 1 ? "bg-accent-soft font-medium text-accent" : ""}`}>{i === 1 ? <Check className="size-3" /> : <span className="size-3" />}{t}</p>
          ))}
        </div>
      </Screen>
    </Frame>
  ),

  leave: () => (
    <Frame>
      <Screen className="space-y-2">
        <p className="font-display text-lg leading-tight">Head de Produto</p>
        <div className="flex flex-wrap gap-1"><Btn><CheckCheck className="size-3" /> Marcar vistas</Btn><Btn><Mail className="size-3" /> E-mail</Btn></div>
        <span className="anim-pop inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-0.5 pr-0.5 pl-2.5 text-[10.5px] text-accent" style={d(0.4)}>
          Sair desta busca?
          <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-ink"><LogOut className="mr-0.5 inline size-3" />Sair</span>
          <span className="px-1.5">Não</span>
        </span>
      </Screen>
    </Frame>
  ),


  resumeScore: () => (
    <Frame>
      <Screen>
        <p className="text-[9px] font-semibold tracking-wider text-ink-3 uppercase">Pontuação do currículo</p>
        <div className="mt-2 flex items-center gap-3">
          <ScoreRing value={87} size={56} />
          <div><p className="text-[12px] font-semibold">Muito bom</p><p className="text-[9.5px] text-ink-3">Product Designer sênior</p></div>
        </div>
        <div className="mt-2.5 space-y-1.5">
          {[["Abrangência", 92], ["Estrutura", 85], ["Clareza", 78]].map(([l, v], k) => (
            <div key={l as string} className="anim-pop" style={d(0.2 + k * 0.12)}>
              <div className="mb-0.5 flex justify-between text-[9.5px]"><span>{l as string}</span><span className="text-ink-3">{v as number}%</span></div>
              <Bar value={v as number} />
            </div>
          ))}
        </div>
      </Screen>
    </Frame>
  ),

  resumeChat: () => (
    <Frame>
      <div className="space-y-1.5">
        {[["Analisando seu currículo…", 0], ["O primeiro item da experiência está vago. Sugestão:", 0.5]].map(([t, s]) => (
          <p key={t as string} className="anim-pop flex items-center gap-1.5" style={d(s as number)}>
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-bg"><Sparkles className="size-2.5" /></span>
            <span className="rounded-xl rounded-tl-sm bg-surface px-2 py-1 text-[10px] shadow-card">{t as string}</span>
          </p>
        ))}
        <Screen className="!p-2.5" style={d(0.9)}>
          <p className="rounded-lg bg-surface-2 px-2 py-1 text-[9.5px] text-ink-3 line-through decoration-accent/60">Responsável pelo design do app</p>
          <p className="mt-1 rounded-lg bg-ok-soft px-2 py-1 text-[9.5px]">Redesenhei o checkout do app e reduzi o abandono em [X%]</p>
          <div className="mt-1.5 flex gap-1"><Btn primary className="g-press"><Check className="size-3" /> Aceitar</Btn><Btn><Pencil className="size-3" /> Editar</Btn></div>
        </Screen>
        <p className="anim-pop flex items-center gap-1.5" style={d(1.6)}>
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ok text-white"><Check className="size-2.5" /></span>
          <span className="rounded-xl rounded-tl-sm bg-surface px-2 py-1 text-[10px] shadow-card">Aceito! Currículo atualizado 🎉</span>
        </p>
      </div>
    </Frame>
  ),

  resumeFit: () => (
    <Frame>
      <Screen className="!border-ok/40 text-center">
        <div className="flex items-center justify-center gap-3">
          <ScoreRing value={96} size={60} suffix="%" />
          <div className="text-left">
            <span className="inline-flex items-center gap-1 rounded-full bg-ok px-2 py-0.5 text-[8.5px] font-bold tracking-wide text-white uppercase"><Star className="size-2.5 fill-current" /> Top match</span>
            <p className="mt-1 text-[10px] text-ink-2">Product Designer Sênior · Nubank</p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1">
          {["Figma", "Design system", "Pesquisa"].map((t, k) => <span key={t} className="anim-pop rounded-full bg-ok-soft px-2 py-0.5 text-[9.5px] font-medium text-ok" style={d(0.4 + k * 0.1)}>✓ {t}</span>)}
          <span className="anim-pop rounded-full border border-accent/40 bg-accent-soft/60 px-2 py-0.5 text-[9.5px] font-medium text-accent" style={d(0.8)}>+ SQL</span>
        </div>
      </Screen>
    </Frame>
  ),

  resumeLetter: () => (
    <Frame>
      <Screen>
        <div className="flex items-center justify-between"><p className="flex items-center gap-1 text-[10.5px] font-semibold"><FileText className="size-3 text-accent" /> Carta de apresentação</p><Btn className="g-press"><Copy className="size-2.5" /> Copiar</Btn></div>
        <div className="mt-2 space-y-1">
          {[100, 92, 96, 70, 0, 98, 88, 60].map((w, i) => w
            ? <span key={i} className="anim-pop block h-1.5 rounded-full bg-surface-2" style={{ width: `${w}%`, ...d(0.15 + i * 0.08) }} />
            : <span key={i} className="block h-1" />)}
        </div>
        <p className="mt-2 text-[9.5px] text-ink-3">Escrita a partir do seu currículo e dos requisitos da vaga.</p>
      </Screen>
    </Frame>
  ),

  resumeRefine: () => (
    <Frame>
      <Screen className="space-y-1.5 !p-2.5">
        <p className="rounded-lg bg-ok-soft px-2 py-1 text-[9.5px]">- Redesenhei o checkout e reduzi o abandono em [X%]</p>
        <p className="anim-pop flex justify-end" style={d(0.3)}><span className="max-w-[80%] rounded-xl rounded-br-sm bg-ink px-2 py-1 text-[9.5px] text-bg">Foi 30% em 6 meses, no app iOS e Android</span></p>
        <p className="anim-pop flex" style={d(0.9)}><span className="max-w-[85%] rounded-xl rounded-bl-sm bg-surface-2 px-2 py-1 text-[9.5px]">Troquei o [X%] por 30% e incluí o prazo.</span></p>
        <p className="anim-pop rounded-lg bg-ok-soft px-2 py-1 text-[9.5px] ring-2 ring-ok/30" style={d(1.3)}>- Redesenhei o checkout e reduzi o abandono em 30% em 6 meses</p>
        <div className="flex gap-1"><Btn primary className="g-press"><Check className="size-3" /> Aceitar</Btn><Btn className="!border-accent !bg-accent-soft !text-accent"><Sparkles className="size-3" /> Refinar com a IA</Btn></div>
      </Screen>
    </Frame>
  ),

  fitBulk: () => (
    <Frame>
      <div className="relative">
        <Screen className="space-y-1 !p-2">
          {[["Head of Growth", 91, true], ["Growth Manager", null, true], ["CRM Lead", null, true], ["Director, Growth", 34, false]].map(([t, v, sel], k) => (
            <div key={t as string} className={`anim-pop flex items-center gap-1.5 rounded-lg border px-1.5 py-1 ${sel ? "border-accent/50 bg-accent-soft/50" : "border-line bg-bg/70"}`} style={d(k * 0.1)}>
              <span className={`grid size-3.5 place-items-center rounded-[3px] border ${sel ? "border-accent bg-accent text-accent-ink" : "border-ink-3"}`}>{sel ? <Check className="size-2.5" /> : null}</span>
              {v != null ? <ScoreRing value={v as number} size={20} stroke={3} hideValue /> : <span className="size-5 rounded-full border border-dashed border-line" />}
              <span className="flex-1 truncate text-[10px] font-semibold">{t as string}</span>
              <span className="text-[9px] text-ink-3">{v != null ? `${v}%` : "—"}</span>
            </div>
          ))}
        </Screen>
        <div className="anim-pop absolute inset-x-3 -bottom-3 flex items-center gap-2 rounded-full bg-ink px-2.5 py-1.5 text-bg shadow-pop" style={d(0.6)}>
          <span className="flex-1 text-[9.5px]"><strong>3</strong> selecionadas</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-medium text-accent-ink">Verificar compatibilidade</span>
        </div>
      </div>
    </Frame>
  ),

  segments: () => (
    <Frame>
      <Screen className="space-y-2">
        <p className="flex items-center gap-1 text-[10.5px] font-semibold"><Building2 className="size-3 text-accent" /> Segmentar empresas</p>
        <div className="flex flex-wrap gap-1">{["B2B", "B2C", "B2B2C"].map((t, i) => <Chip key={t} on={i === 0}>{t}</Chip>)}</div>
        <div className="flex flex-wrap gap-1">{["Startup", "Média", "Grande"].map((t, i) => <Chip key={t} on={i > 0}>{t}</Chip>)}</div>
        <div className="flex flex-wrap gap-1">{["Fintech", "Software e SaaS", "Varejo"].map((t, i) => <Chip key={t} on={i < 2}>{t}</Chip>)}</div>
        <p className="anim-pop rounded-lg bg-accent-soft px-2 py-1 text-[9.5px] text-accent" style={d(0.6)}>Filtrada · segmento: empresa B2C</p>
      </Screen>
    </Frame>
  ),

  listSort: () => (
    <Frame>
      <Screen className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded-full bg-ink px-2 py-0.5 text-[9.5px] text-bg">Mais compatíveis</span>
          <span className="rounded-full border border-ok/50 bg-ok-soft px-2 py-0.5 text-[9.5px] font-medium text-ok">Top match (85+)</span>
        </div>
        {[["Head of Growth Marketing", "Nubank", 96], ["Growth Lead", "Stone", 88]].map(([t, c, v], k) => (
          <div key={t as string} className="anim-pop rounded-xl border border-line bg-bg/70 p-2" style={d(0.2 + k * 0.15)}>
            <p className="truncate text-[11px] font-semibold">{t as string}</p>
            <p className="text-[9.5px] text-ink-3">{c as string}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-ok/40 bg-ok-soft py-px pr-2 pl-px text-[9.5px] font-semibold text-ok"><ScoreRing value={v as number} size={14} stroke={2} hideValue />{v as number}% compatível · top match</span>
          </div>
        ))}
      </Screen>
    </Frame>
  ),

  cvTabs: () => (
    <Frame>
      <div className="space-y-2">
        <div className="flex gap-1.5">
          {[["Growth", "Head de Growth", 84, true], ["Product", "Product Manager", 71, false]].map(([n, t, v, p], k) => (
            <Screen key={n as string} className={`!flex flex-1 items-center gap-1.5 !p-1.5 ${k === 0 ? "!border-ink" : ""}`} style={d(k * 0.15)}>
              <ScoreRing value={v as number} size={26} />
              <span className="min-w-0"><span className="flex items-center gap-1 text-[10px] font-semibold">{n as string}{p ? <span className="rounded-full bg-accent-soft px-1 text-[7.5px] text-accent">principal</span> : null}</span><span className="block truncate text-[8.5px] text-ink-3">{t as string}</span></span>
            </Screen>
          ))}
        </div>
        <Screen className="!p-2.5" style={d(0.4)}>
          <p className="font-display text-base leading-tight">Busca · Product</p>
          <div className="mt-1.5 flex flex-wrap gap-1"><Btn primary><RefreshCw className="size-3" /> Rodar agora</Btn><Btn className="g-press !border-accent !text-accent"><FileText className="size-3" /> Currículo: Product <ChevronDown className="size-2.5" /></Btn></div>
          <p className="mt-1.5 text-[9px] text-ink-3">as notas desta busca usam o currículo “Product”</p>
        </Screen>
      </div>
    </Frame>
  ),

  linkedinScore: () => (
    <Frame>
      <Screen>
        <div className="flex items-center gap-2"><span className="rounded bg-[#0a66c2] px-1 text-[9px] leading-[14px] font-extrabold text-white">in</span><p className="text-[10.5px] font-semibold">Nota do perfil · Head de Growth</p></div>
        <div className="mt-2 flex items-center gap-3"><ScoreRing value={68} size={50} /><div><p className="text-[12px] font-semibold">Regular</p><p className="text-[9.5px] text-ink-3">Título genérico e Sobre sem resultados</p></div></div>
        <div className="mt-2 space-y-1.5">
          {[["Título", 45], ["Sobre", 60], ["Encontrabilidade", 72]].map(([l, v], k) => (
            <div key={l as string} className="anim-pop" style={d(0.2 + k * 0.12)}><div className="mb-0.5 flex justify-between text-[9.5px]"><span>{l as string}</span><span className="text-ink-3">{v as number}%</span></div><Bar value={v as number} /></div>
          ))}
        </div>
      </Screen>
    </Frame>
  ),

  linkedinHeadline: () => (
    <Frame>
      <Screen className="space-y-1.5">
        <p className="text-[10.5px] font-semibold">3 opções de título</p>
        {["Head de Growth | Aquisição, CRO e Experimentação | Fintech", "Growth que transforma dados em receita · ex-Nubank", "Liderança de Growth para produtos digitais B2C"].map((h, k) => (
          <div key={h} className="anim-pop flex items-center gap-1.5 rounded-lg border border-line bg-bg/70 p-1.5" style={d(k * 0.15)}>
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#0a66c2]/10 text-[8px] font-bold text-[#0a66c2]">{k + 1}</span>
            <span className="flex-1 truncate text-[9.5px] font-medium">{h}</span>
            <span className="font-mono text-[8px] text-ink-3">{h.length}/220</span>
            <span className={`rounded-full border border-line px-1.5 text-[8.5px] ${k === 0 ? "g-press" : ""}`}><Copy className="inline size-2.5" /></span>
          </div>
        ))}
      </Screen>
    </Frame>
  ),
};

function KanbanMini({ select = false }: { select?: boolean }) {
  const cols = [["A candidatar", "#2F6BFF"], ["Candidatura feita", "#14A37F"]] as const;
  return (
    <Frame>
      <div className="grid grid-cols-2 gap-2">
        {cols.map(([t, c], k) => (
          <div key={t} className={`anim-pop relative rounded-2xl border border-line bg-surface-2/90 p-2 shadow-card ${k === 0 ? "z-10" : ""}`} style={d(k * 0.15)}>
            <p className="mb-1.5 flex items-center gap-1 truncate text-[10px] font-semibold"><span className="size-2 shrink-0 rounded-full" style={{ background: c }} />{t}</p>
            <div className="relative space-y-1.5">
              {k === 0 && (
                <div className={`relative z-10 rounded-xl border border-accent bg-surface p-1.5 shadow-pop ${select ? "" : "g-drag"}`}>
                  <div className="flex items-center gap-1.5"><Av t="NU" c="#A855F7" s={20} /><span className="truncate text-[9.5px] font-semibold">Product Designer</span></div>
                  {select
                    ? <span className="mt-1.5 flex items-center justify-between rounded-md border border-accent bg-bg px-1.5 py-0.5 text-[9px] text-accent ring-2 ring-accent/15">Candidatura feita <ChevronDown className="size-2.5" /></span>
                    : <MousePointer2 className="absolute -right-1 -bottom-2 size-4 fill-ink text-bg" />}
                </div>
              )}
              <div className="rounded-xl border border-line bg-surface p-1.5"><div className="flex items-center gap-1.5"><Av t={k ? "ST" : "QU"} c={k ? "#E8501F" : "#2F6BFF"} s={20} /><span className="truncate text-[9.5px] font-semibold">{k ? "Staff Designer" : "Design Lead"}</span></div></div>
              {k === 1 && <div className={`h-10 rounded-xl border border-dashed border-accent/60 ${select ? "opacity-0" : "g-drop"}`} />}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function GuideVisual({ name }: { name: VisualKey }) {
  return <div aria-hidden className="pointer-events-none select-none">{V[name]()}</div>;
}
