import { createClient } from "@supabase/supabase-js";

// Stateless server client (anon key) for route handlers. RLS + DB triggers
// apply, so this is safe for the frictionless guest write path (entries,
// votes, reactions, photo upload). No cookies/session needed.
export function createRouteClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
