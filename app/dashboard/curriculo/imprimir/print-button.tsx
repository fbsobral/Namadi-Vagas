"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-[#17140f] px-5 py-2.5 text-sm font-medium text-white">
      <Printer className="size-4" /> Imprimir / salvar PDF
    </button>
  );
}
