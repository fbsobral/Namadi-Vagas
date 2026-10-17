"use client";

import { useEffect, useState, useTransition } from "react";
import { Mail, Send } from "lucide-react";
import { getMailInfo, sendTestEmail, type SearchInput } from "@/app/actions";

const MODES: { v: SearchInput["notify_mode"]; l: string; hint: string }[] = [
  { v: "off", l: "Desligado", hint: "" },
  { v: "run", l: "A cada rodada", hint: "Um e-mail sempre que o robô achar vaga nova. Sem vaga nova, nada é enviado." },
  { v: "daily", l: "Resumo diário (8h)", hint: "Um único e-mail por dia, às 8h, juntando tudo que o robô achou desde o último." },
];

export function EmailSettings({ mode, onChange, searchId }: { mode: SearchInput["notify_mode"]; onChange: (m: SearchInput["notify_mode"]) => void; searchId?: string }) {
  const [info, setInfo] = useState<{ email: string | null; configured: boolean } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    getMailInfo().then((i) => alive && setInfo(i)).catch(() => alive && setInfo({ email: null, configured: false }));
    return () => { alive = false; };
  }, []);

  const hint = MODES.find((m) => m.v === mode)?.hint;

  return (
    <fieldset className="mt-6">
      <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Mail className="size-4 text-accent" /> Resumo por e-mail</legend>
      <div className="inline-flex flex-wrap rounded-xl border border-line bg-bg p-1">
        {MODES.map((m) => (
          <button type="button" key={m.v} onClick={() => { onChange(m.v); setMsg(null); }} aria-pressed={mode === m.v}
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition ${mode === m.v ? "bg-surface font-medium shadow-card" : "text-ink-3 hover:text-ink"}`}>{m.l}</button>
        ))}
      </div>

      {mode !== "off" && (
        <div className="mt-2.5 space-y-2 text-[13px] text-ink-2">
          <p className="text-ink-3">{hint}</p>
          <p>
            Enviaremos para{" "}
            {info === null ? <span className="skeleton inline-block h-3.5 w-40 rounded align-middle" /> : info.email ? <strong className="font-medium text-ink">{info.email}</strong> : <span className="text-accent">— seu e-mail principal ainda não está verificado</span>}
          </p>
          {info && !info.configured && (
            <p className="rounded-xl bg-accent-soft px-3 py-2 text-accent">O servidor ainda não tem o envio de e-mail configurado (RESEND_API_KEY e MAIL_FROM). Você pode salvar agora; os e-mails começam quando isso for configurado.</p>
          )}
          {searchId ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={pending || !info?.configured || !info?.email}
                onClick={() => start(async () => {
                  setMsg(null);
                  try { const r = await sendTestEmail(searchId); setMsg({ ok: true, text: `Enviado para ${r.to}. Veja a caixa de entrada (e o spam).` }); }
                  catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Não consegui enviar." }); }
                })}
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-50">
                <Send className="size-4" /> {pending ? "Enviando…" : "Enviar e-mail de teste"}
              </button>
              {msg && <span role="status" className={msg.ok ? "text-ok" : "text-accent"}>{msg.text}</span>}
            </div>
          ) : (
            <p className="text-ink-3">O botão de e-mail de teste aparece depois que a busca for criada.</p>
          )}
        </div>
      )}
    </fieldset>
  );
}
