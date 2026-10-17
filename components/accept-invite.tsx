"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction, declineInviteAction } from "@/app/actions";

export function AcceptInvite({ token, memberId }: { token: string; memberId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-7">
      <div className="flex flex-wrap gap-3">
        <button disabled={pending} onClick={() => start(async () => {
          setError(null);
          try { const sid = await acceptInviteAction({ token }); router.push(`/dashboard?s=${sid}`); }
          catch (e) { setError(e instanceof Error ? e.message : "Não consegui aceitar."); }
        })} className="rounded-full bg-accent px-7 py-3 font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50">{pending ? "Entrando…" : "Aceitar e ver as vagas"}</button>
        <button disabled={pending} onClick={() => start(async () => { await declineInviteAction(memberId); router.push("/dashboard"); })}
          className="rounded-full border border-line px-6 py-3 font-medium text-ink-2 transition hover:bg-surface-2 disabled:opacity-50">Recusar</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{error}</p>}
    </div>
  );
}
