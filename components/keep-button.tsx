"use client";

import { useTransition } from "react";
import { keepFiltered } from "@/app/actions";

export function KeepButton({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => { await keepFiltered(jobId); })}
      className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium transition hover:bg-surface-2 disabled:opacity-50">
      {pending ? "Mantendo…" : "Manter na lista"}
    </button>
  );
}
