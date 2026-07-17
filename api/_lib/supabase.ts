import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured on the server-side.");
}

export const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured on the server side. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }
  return supabase;
}
