"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavorite } from "@/app/actions";

export function FavoriteButton({ jobId, favorite, label = false }: { jobId: string; favorite: boolean; label?: boolean }) {
  const [fav, setFav] = useState(favorite);
  const [pop, setPop] = useState(0);
  const [, start] = useTransition();
  const [prev, setPrev] = useState(favorite);
  if (prev !== favorite) { setPrev(favorite); setFav(favorite); }

  return (
    <button
      aria-pressed={fav}
      aria-label={fav ? "Remover dos favoritos" : "Favoritar e buscar pessoas no LinkedIn"}
      title={fav ? "Remover dos favoritos" : "Favoritar — o robô busca pessoas para conhecer"}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        const next = !fav;
        setFav(next); if (next) setPop((p) => p + 1);
        start(async () => { await toggleFavorite(jobId, next); });
      }}
      className={`inline-flex items-center gap-2 rounded-full transition ${label ? `border px-4 py-2 text-sm font-medium ${fav ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:bg-surface-2"}` : `size-10 justify-center hover:bg-accent-soft ${fav ? "text-accent" : "text-ink-3 hover:text-accent"}`}`}
    >
      <Star key={pop} className={`size-5 ${fav ? "fill-accent" : ""} ${pop ? "anim-star" : ""}`} />
      {label && (fav ? "Favorita" : "Favoritar")}
    </button>
  );
}
