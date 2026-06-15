import { createBrowserClient } from "@supabase/ssr";

// Browser client — anon key only. Used for public reads and Realtime
// subscriptions (Party Mode). All writes go through server route handlers.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
