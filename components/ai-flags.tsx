"use client";

import { createContext, useContext } from "react";
import type { AiFlags } from "@/lib/ai-shared";

// Quais recursos de IA estão ligados (painel /admin). As telas escondem o que está desligado;
// o servidor recusa de qualquer forma.
const Ctx = createContext<AiFlags | null>(null);

export function AiFlagsProvider({ flags, children }: { flags: AiFlags; children: React.ReactNode }) {
  return <Ctx.Provider value={flags}>{children}</Ctx.Provider>;
}

export const useAiFlags = (): AiFlags =>
  useContext(Ctx) ?? { cv_fill: true, resume: true, fit: true, quickfit: true, autofit: true, letter: true, company: true };
