"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { markGuideSeen, resetGuides } from "@/app/actions";
import type { GuideId } from "@/lib/onboarding";
import { GuideContext, GuideSheet, HelpCenter, type GuideCtx } from "./guide";
import { SearchDialog } from "./search-dialog";

/**
 * Guarda quais guias a pessoa já viu (vem do servidor, então vale em qualquer aparelho),
 * abre o tour de boas-vindas na primeira visita e controla os guias de cada módulo.
 */
export function OnboardingProvider({ seen: initial, hasSearches, children }: { seen: string[]; hasSearches: boolean; children: React.ReactNode }) {
  const [seen, setSeen] = useState(() => new Set(initial));
  const [active, setActive] = useState<GuideId | null>(null);
  const [help, setHelp] = useState(false);
  const [create, setCreate] = useState(false);

  const markSeen = useCallback((id: GuideId) => {
    setSeen((s) => (s.has(id) ? s : new Set(s).add(id)));
    markGuideSeen(id).catch(() => {}); // se falhar, no pior caso o guia aparece de novo
  }, []);

  // primeira visita: tour geral (um instante depois, para a página assentar)
  useEffect(() => {
    if (initial.includes("welcome")) return;
    const t = setTimeout(() => setActive((a) => a ?? "welcome"), 400);
    return () => clearTimeout(t);
  }, [initial]);

  const close = useCallback(() => {
    if (active) markSeen(active);
    setActive(null);
  }, [active, markSeen]);

  const ctx = useMemo<GuideCtx>(() => ({
    seen,
    active,
    open: (id) => { setHelp(false); setActive(id); },
    dismiss: markSeen,
    openHelp: () => setHelp(true),
    reset: () => { setSeen(new Set()); resetGuides().catch(() => {}); },
  }), [seen, active, markSeen]);

  return (
    <GuideContext.Provider value={ctx}>
      {children}
      {help && !active && (
        <HelpCenter seen={seen} onClose={() => setHelp(false)} onPick={(id) => ctx.open(id)}
          onReset={() => { ctx.reset(); setHelp(false); setActive("welcome"); }} />
      )}
      {active && (
        <GuideSheet key={active} id={active} onClose={close}
          finalAction={active === "welcome" && !hasSearches ? { label: "Criar minha primeira busca", run: () => { close(); setCreate(true); } } : null} />
      )}
      <SearchDialog open={create} onClose={() => setCreate(false)} />
    </GuideContext.Provider>
  );
}
