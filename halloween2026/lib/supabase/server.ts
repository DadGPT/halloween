import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side anon client (RLS-bound). Used in Server Components for reads.
// In Next.js 16, cookies() is async.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware/proxy
            // refreshes sessions. (No auth sessions in this app, but kept correct.)
          }
        },
      },
    },
  );
}
