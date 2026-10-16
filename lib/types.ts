export type Search = {
  id: string;
  user_id: string;
  name: string;
  query: string;
  location: string;
  sources: string; // JSON array de chaves de lib/sources
  recency: "day" | "week" | "month" | "any";
  freq_minutes: number;
  active: number;
  color: string;
  last_run_at: number | null;
  next_run_at: number | null;
  last_status: "idle" | "running" | "ok" | "error";
  last_error: string | null;
  created_at: number;
  // agregados
  total?: number;
  unseen?: number;
  favs?: number;
};

export type Job = {
  id: string;
  user_id: string;
  search_id: string;
  title: string;
  company: string;
  url: string;
  source: string;
  snippet: string;
  location: string | null;
  found_at: number;
  favorite: number;
  favorited_at: number | null;
  seen: number;
  contacts_status: "idle" | "pending" | "done" | "error";
  contacts_error: string | null;
  search_name?: string;
  search_color?: string;
};

export type ContactRole = "recruiter" | "leader" | "peer";

export type Contact = {
  id: string;
  job_id: string;
  user_id: string;
  name: string;
  headline: string;
  url: string;
  snippet: string;
  role: ContactRole;
  score: number;
  found_at: number;
};
