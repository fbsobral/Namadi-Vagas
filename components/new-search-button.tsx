"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { SearchDialog } from "./search-dialog";

export function NewSearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-accent-ink shadow-pop transition hover:-translate-y-0.5">
        <Plus className="size-5" /> Criar primeira busca
      </button>
      <SearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
