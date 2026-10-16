"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/auth";
import * as q from "@/lib/db";
import { runSearch } from "@/lib/runner";
import { findContacts } from "@/lib/contacts";
import { PALETTE, SOURCES } from "@/lib/sources";
import { isStage } from "@/lib/stages";
import { cleanSpec, specToQuery, type QuerySpec } from "@/lib/query";

export type SearchInput = {
  name: string;
  spec: QuerySpec;
  location: string;
  sources: string[];
  recency: "day" | "week" | "month" | "any";
  freq_minutes: number;
};

async function uid() {
  const userId = await getUserId();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

function sanitize(i: SearchInput) {
  const spec = cleanSpec(i.spec);
  const query = specToQuery(spec).slice(0, 400);
  if (!query) throw new Error("Adicione pelo menos uma palavra-chave");
  const valid = new Set(SOURCES.map((s) => s.key));
  const sources = i.sources.filter((s) => valid.has(s));
  return {
    name: (i.name.trim() || spec.groups[0]?.terms[0] || query).slice(0, 80),
    query,
    query_spec: JSON.stringify(spec),
    location: i.location.trim().slice(0, 80),
    sources: JSON.stringify(sources.length ? sources : ["web"]),
    recency: (["day", "week", "month", "any"].includes(i.recency) ? i.recency : "week") as SearchInput["recency"],
    freq_minutes: Math.min(Math.max(Math.round(i.freq_minutes) || 360, 15), 60 * 24 * 30),
  };
}

const refresh = () => revalidatePath("/dashboard");

export async function createSearch(input: SearchInput) {
  const userId = await uid();
  const id = randomUUID();
  const count = (await q.listSearches(userId)).length;
  await q.insertSearch({ id, user_id: userId, active: 1, color: PALETTE[count % PALETTE.length], ...sanitize(input) });
  after(() => runSearch(id)); // já traz as primeiras vagas
  refresh();
  return id;
}

export async function editSearch(id: string, input: SearchInput) {
  const userId = await uid();
  await q.updateSearch(userId, id, sanitize(input));
  refresh();
}

export async function removeSearch(id: string) {
  await q.deleteSearch(await uid(), id);
  refresh();
}

export async function toggleSearch(id: string, active: boolean) {
  await q.setSearchActive(await uid(), id, active);
  refresh();
}

export async function runNow(id: string) {
  const userId = await uid();
  if (!(await q.getSearch(userId, id))) throw new Error("Busca não encontrada");
  const r = await runSearch(id);
  refresh();
  return r;
}

export async function toggleFavorite(jobId: string, fav: boolean) {
  const userId = await uid();
  const job = await q.getJob(userId, jobId);
  if (!job) throw new Error("Vaga não encontrada");
  await q.setFavorite(userId, jobId, fav);
  // claim atômico: favoritar duas vezes (ou em duas abas) nunca dispara duas buscas
  if (fav && (await q.claimContacts(userId, jobId))) after(() => findContacts(jobId)); // robô do LinkedIn em segundo plano
  refresh();
}

export async function retryContacts(jobId: string) {
  const userId = await uid();
  if (!(await q.getJob(userId, jobId))) throw new Error("Vaga não encontrada");
  if (await q.claimContacts(userId, jobId, true)) after(() => findContacts(jobId));
  refresh();
}

export async function seeJob(jobId: string) {
  await q.markSeen(await uid(), jobId);
  refresh();
}

export async function seeAll(searchId: string | null) {
  await q.markAllSeen(await uid(), searchId);
  refresh();
}

export async function moveJobStage(jobId: string, stage: string, index: number) {
  if (!isStage(stage)) throw new Error("Etapa inválida");
  await q.moveJob(await uid(), jobId, stage, index);
  refresh();
}
