"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Celular: chamada fixa no rodapé, só depois que a do topo sai da tela e enquanto a chamada final não aparece. */
export function StickyCta({ href, label, hideWhen }: { href: string; label: string; hideWhen: string[] }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const els = hideWhen.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setShow(visible.size === 0);
    });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [hideWhen]);

  return (
    <div aria-hidden={!show}
      className={`pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 pt-3 backdrop-blur transition duration-300 sm:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}>
      <Link href={href} tabIndex={show ? 0 : -1} className="flex items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-medium text-accent-ink shadow-pop">
        {label} <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}
