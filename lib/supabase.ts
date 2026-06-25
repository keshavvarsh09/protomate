import { createClient, SupabaseClient } from "@supabase/supabase-js";

// the app works with or without supabase.
// if the two env vars are set, it uses your supabase project.
// if not, the UI falls back to local mock data so it still runs.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anon);

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url as string, anon as string)
  : null;
