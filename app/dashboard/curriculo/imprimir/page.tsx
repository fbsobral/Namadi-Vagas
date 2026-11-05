import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { getCv, getPrimaryCv } from "@/lib/db";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

/** Versão limpa do currículo para imprimir ou salvar como PDF pelo navegador. */
export default async function PrintResume({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await getUserId();
  if (!userId) redirect("/sign-in");
  const cvId = (await searchParams).cv;
  const resume = typeof cvId === "string" ? await getCv(userId, cvId) : await getPrimaryCv(userId);
  if (!resume) redirect("/dashboard/curriculo");

  // linhas que parecem título de seção (curtas, sem ponto final) viram cabeçalhos
  const blocks = resume.text.split(/\n{2,}/).map((b) => b.split("\n"));
  return (
    <div className="relative z-10 min-h-dvh bg-white text-[#17140f] print:min-h-0">
      <div className="mx-auto flex max-w-[800px] items-center justify-between gap-3 px-6 pt-6 print:hidden">
        <p className="text-sm text-[#5a544a]">Use “Salvar como PDF” na janela de impressão.</p>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[800px] px-6 py-8 text-[14px] leading-relaxed print:px-0 print:py-0">
        {blocks.map((lines, i) => (
          <section key={i} className="mb-4 break-inside-avoid-page">
            {lines.map((l, j) => {
              const t = l.trim();
              if (!t) return null;
              if (t.startsWith("- ")) return <p key={j} className="relative pl-4 before:absolute before:left-0 before:content-['•']">{t.slice(2)}</p>;
              const heading = j === 0 && t.length < 48 && !/[.:;,]$/.test(t) && lines.length > 1;
              if (i === 0 && j === 0) return <h1 key={j} className="mb-1 text-[26px] font-semibold">{t}</h1>;
              return heading ? <h2 key={j} className="mt-2 mb-1 border-b border-[#e5dfd1] pb-1 text-[13px] font-bold tracking-wider uppercase">{t}</h2> : <p key={j}>{t}</p>;
            })}
          </section>
        ))}
      </article>
    </div>
  );
}
