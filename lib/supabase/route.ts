import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// Stateless server client (anon key) for route handlers. RLS + DB triggers
// apply, so this is safe for the frictionless guest write path (entries,
// votes, reactions, photo upload). No cookies/session needed.
export function createRouteClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
