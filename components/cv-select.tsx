"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { setSearchCvAction } from "@/app/actions";

export type CvOption = { id: string; name: string; target_role: string; is_primary: number; updated_at: number };

/** Qual currículo esta busca usa para mim (as notas de compatibilidade das vagas dela vêm dele). */
export function CvSelect({ searchId, cvs, value }: { searchId: string; cvs: CvOption[]; value: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const btn = "inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium whitespace-nowrap transition hover:bg-surface-2 sm:py-2";
  if (!cvs.length) return <Link href="/dashboard/curriculo" className={btn}><FileText className="size-4" /> Enviar currículo</Link>;
  const primary = cvs.find((c) => c.is_primary);
  return (
    <label className={`${btn} cursor-pointer ${pending ? "opacity-60" : ""}`} title="As notas de compatibilidade desta busca usam este currículo">
      <FileText className="size-4" />
      <span className="sr-only sm:not-sr-only">Currículo:</span>
      <select aria-label="Currículo usado nesta busca" value={value ?? ""} disabled={pending}
        onChange={(e) => start(async () => { await setSearchCvAction(searchId, e.target.value || null); router.refresh(); })}
        className="max-w-[180px] cursor-pointer truncate bg-transparent pr-1 font-medium outline-none">
        <option value="">{primary ? `${primary.name} (principal)` : "principal"}</option>
        {cvs.filter((c) => !c.is_primary).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}
