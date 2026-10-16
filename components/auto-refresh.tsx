"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renderiza a página do servidor enquanto algo está em andamento (robô rodando, contatos sendo buscados). */
export function AutoRefresh({ active, every = 2500 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [active, every, router]);
  return null;
}
