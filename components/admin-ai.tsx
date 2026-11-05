"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowUpRight, Check, Power, Save } from "lucide-react";
import { saveAiConfigAction } from "@/app/actions";
import { AI_MODELS, type AiConfig, type AiFeature } from "@/lib/ai-shared";

type Bucket = { calls: number; errors: number; input: number; output: number; cost: number };
export type UsageStats = {
  total: { today: Bucket; week: Bucket; month: Bucket };
  byFeature: Record<string, { today: Bucket; week: Bucket; month: Bucket }>;
  models: Record<string, Bucket>;
};
type FeatureInfo = { key: AiFeature; label: string; where: string; when: string };

const num = (n: number) => n.toLocaleString("pt-BR");
const tok = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : n >= 1e3 ? `${(n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : num(n));
const usd = (n: number) => `US$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 3 : 2 })}`;

export function AdminAi({ initial, stats, keyConfigured, features }: { initial: AiConfig; stats: UsageStats; keyConfigured: boolean; features: FeatureInfo[] }) {
  const [cfg, setCfg] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(cfg) !== saved;

  const setF = (k: AiFeature, patch: Partial<AiConfig["features"][AiFeature]>) =>
    setCfg((c) => ({ ...c, features: { ...c.features, [k]: { ...c.features[k], ...patch } } }));

  const save = () => start(async () => {
    setMsg(null);
    try { await saveAiConfigAction(cfg); setSaved(JSON.stringify(cfg)); setMsg({ ok: true, text: "Configuração salva." }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Não consegui salvar." }); }
  });

  const tiles: [string, Bucket][] = [["Hoje", stats.total.today], ["7 dias", stats.total.week], ["30 dias", stats.total.month]];

  return (
    <div className="mt-8 space-y-6">
      {!keyConfigured && (
        <p className="flex items-start gap-2 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> ANTHROPIC_API_KEY não está definida no servidor: todos os recursos de IA estão indisponíveis, qualquer que seja a configuração abaixo.</p>
      )}

      {/* chave geral */}
      <section className={`flex flex-wrap items-center gap-4 rounded-3xl border p-5 shadow-card sm:p-6 ${cfg.enabled ? "border-line bg-surface" : "border-accent/40 bg-accent-soft/60"}`}>
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${cfg.enabled ? "bg-ok-soft text-ok" : "bg-accent text-accent-ink"}`}><Power className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{cfg.enabled ? "IA ligada" : "IA desligada para todos"}</p>
          <p className="text-sm text-ink-3">{cfg.enabled ? "Cada recurso abaixo pode ser ligado ou desligado separadamente." : "Nenhum recurso de IA roda enquanto esta chave estiver desligada."}</p>
        </div>
        <Toggle on={cfg.enabled} onChange={(v) => setCfg((c) => ({ ...c, enabled: v }))} label="IA ligada" big />
      </section>

      {/* consumo */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-3xl">Consumo</h2>
          <a href="https://console.anthropic.com/usage" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">Fatura real no Claude Console <ArrowUpRight className="size-4" /></a>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {tiles.map(([l, b]) => (
            <div key={l} className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <p className="text-xs font-medium tracking-wider text-ink-3 uppercase">{l}</p>
              <p className="font-display mt-1 text-4xl">{usd(b.cost)}</p>
              <p className="mt-1 text-sm text-ink-2">{num(b.calls)} chamadas{b.errors ? ` · ${num(b.errors)} com erro` : ""}</p>
              <p className="text-xs text-ink-3">{tok(b.input)} tokens de entrada · {tok(b.output)} de saída</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-3">Custo estimado pelo preço de tabela de cada modelo (US$ por milhão de tokens de entrada/saída), sem descontos de cache. O valor cobrado de fato está no Claude Console.</p>
      </section>

      {/* recursos */}
      <section>
        <h2 className="font-display text-3xl">Recursos</h2>
        <ul className="mt-3 space-y-3">
          {features.map((f) => {
            const c = cfg.features[f.key];
            const u = stats.byFeature[f.key];
            const off = !cfg.enabled || !c.enabled;
            return (
              <li key={f.key} className={`rounded-3xl border bg-surface p-5 shadow-card transition sm:p-6 ${off ? "border-line opacity-80" : "border-line"}`}>
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">{f.label}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${off ? "bg-surface-2 text-ink-3" : "bg-ok-soft text-ok"}`}>{off ? "desligado" : "ligado"}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-3"><span className="text-ink-2">{f.where}.</span> {f.when}.</p>
                  </div>
                  <Toggle on={c.enabled} onChange={(v) => setF(f.key, { enabled: v })} label={`Ligar ${f.label}`} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1.2fr] sm:items-end">
                  <label className="block min-w-0">
                    <span className="mb-1 block text-xs font-medium text-ink-3">Modelo</span>
                    <select value={c.model} onChange={(e) => setF(f.key, { model: e.target.value as typeof c.model })} disabled={!c.enabled}
                      className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60">
                      {AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label} · US$ {m.input}/{m.output}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-3">Limite por pessoa/dia</span>
                    <input type="number" min={0} value={c.daily} onChange={(e) => setF(f.key, { daily: Number(e.target.value) })} disabled={!c.enabled}
                      className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60 sm:w-32" />
                  </label>
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2/70 p-3 text-center">
                    {(["today", "week", "month"] as const).map((k) => (
                      <div key={k}>
                        <p className="text-[10px] font-medium tracking-wider text-ink-3 uppercase">{k === "today" ? "Hoje" : k === "week" ? "7 dias" : "30 dias"}</p>
                        <p className="text-sm font-semibold">{usd(u?.[k].cost ?? 0)}</p>
                        <p className="text-[11px] text-ink-3">{num(u?.[k].calls ?? 0)} chamadas</p>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {Object.keys(stats.models).length > 0 && (
        <section>
          <h2 className="font-display text-3xl">Por modelo · 30 dias</h2>
          <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/70 text-left text-xs text-ink-3"><tr><th className="px-4 py-2.5 font-medium">Modelo</th><th className="px-4 py-2.5 text-right font-medium">Chamadas</th><th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Tokens</th><th className="px-4 py-2.5 text-right font-medium">Custo est.</th></tr></thead>
              <tbody>
                {Object.entries(stats.models).sort((a, b) => b[1].cost - a[1].cost).map(([m, b]) => (
                  <tr key={m} className="border-t border-line">
                    <td className="px-4 py-2.5">{AI_MODELS.find((x) => x.id === m)?.label ?? m}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{num(b.calls)}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular-nums sm:table-cell">{tok(b.input + b.output)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{usd(b.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* salvar */}
      <div className="pb-safe sticky bottom-0 z-20 -mx-4 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-3">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-ink-2">{msg ? <span className={msg.ok ? "text-ok" : "text-accent"}>{msg.text}</span> : dirty ? "Alterações não salvas." : "Tudo salvo."}</p>
          {dirty && <button onClick={() => { setCfg(JSON.parse(saved)); setMsg(null); }} className="min-h-10 rounded-full px-4 text-sm text-ink-2 hover:text-ink">Descartar</button>}
          <button disabled={!dirty || pending} onClick={save} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg disabled:opacity-40">
            {pending ? "Salvando…" : dirty ? <><Save className="size-4" /> Salvar</> : <><Check className="size-4" /> Salvo</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label, big }: { on: boolean; onChange: (v: boolean) => void; label: string; big?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative shrink-0 rounded-full transition ${big ? "h-8 w-14" : "h-7 w-12"} ${on ? "bg-ok" : "bg-line"}`}>
      <span className={`absolute top-1 rounded-full bg-white shadow transition-all ${big ? "size-6" : "size-5"} ${on ? (big ? "left-7" : "left-6") : "left-1"}`} />
    </button>
  );
}
