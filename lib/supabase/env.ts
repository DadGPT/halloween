// Public Supabase config.
//
// These two values ship to the browser and are protected by Row Level
// Security, so they are SAFE to commit — Supabase publishable/anon keys are
// designed to be public. Baking them in makes the Vercel deploy zero-config.
// Override with NEXT_PUBLIC_* env vars to point at a different project.
//
// The SECRET service-role key is never here and never committed.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://bmvhcfrxosgvdipdkomb.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_dD-2YG1bZiL_dnElDuS_uA_qOZr67QX";
