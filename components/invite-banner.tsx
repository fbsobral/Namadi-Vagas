"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { acceptInviteAction, declineInviteAction } from "@/app/actions";
import type { PendingInvite } from "@/lib/db";

export function InviteBanner({ invites }: { invites: PendingInvite[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!invites.length) return null;

  return (
    <div className="anim-rise mb-6 space-y-2" role="region" aria-label="Convites">
      {invites.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"><Users className="size-4" /></span>
          <p className="min-w-0 flex-1 text-sm"><strong>{i.inviter_name ?? "Alguém"}</strong> compartilhou a busca <strong>“{i.search_name}”</strong> com você.</p>
          <div className="flex gap-2">
            <button disabled={pending} onClick={() => start(async () => {
              setError(null);
              try { const sid = await acceptInviteAction({ id: i.id }); router.push(`/dashboard?s=${sid}`); }
              catch (e) { setError(e instanceof Error ? e.message : "Não consegui aceitar."); }
            })} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50">Aceitar</button>
            <button disabled={pending} onClick={() => start(async () => { await declineInviteAction(i.id); })}
              className="rounded-full border border-accent/40 px-4 py-2 text-sm font-medium text-accent transition hover:bg-surface/60 disabled:opacity-50">Recusar</button>
          </div>
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-accent">{error}</p>}
    </div>
  );
}
