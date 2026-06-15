import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. SERVER-ONLY. Never import into a
// component that ships to the browser. Used by route handlers to perform
// all writes (entries, votes, reactions) and admin actions, so that device
// rules (one ballot/device, self-vote block, phase) are enforced in one place.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
