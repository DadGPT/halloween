import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// Aggregated standings for Party Mode (/live): per-category ranked entries,
// totals, and current phase/settings. Recomputed on demand; the big screen
// refetches this when Realtime signals a change.
export const dynamic = "force-dynamic";

type Lite = {
  id: string;
  name: string;
  photo_url: string | null;
  kind: string;
  device_id: string;
};

export async function GET() {
  const supabase = createRouteClient();
  const [entriesRes, countsRes, settingsRes, phaseRes, catsRes] =
    await Promise.all([
      supabase.from("entries").select("id,name,photo_url,kind,device_id"),
      supabase.from("entry_vote_counts").select("*"),
      supabase.from("contest_settings").select("*").eq("id", 1).single(),
      supabase.rpc("current_phase"),
      supabase.from("categories").select("*").eq("active", true).order("sort_order"),
    ]);

  const entries = (entriesRes.data ?? []) as Lite[];
  const byId = new Map(entries.map((e) => [e.id, e]));
  const categories = catsRes.data ?? [];

  const byCategory: Record<string, { entry: Lite; votes: number }[]> = {};
  for (const c of categories) byCategory[c.id] = [];
  for (const row of countsRes.data ?? []) {
    const entry = byId.get(row.entry_id);
    if (!entry || !byCategory[row.category_id]) continue;
    byCategory[row.category_id].push({ entry, votes: row.votes });
  }
  for (const k of Object.keys(byCategory)) {
    byCategory[k].sort((a, b) => b.votes - a.votes);
  }

  const totalVotes = (countsRes.data ?? []).reduce((a, r) => a + r.votes, 0);

  return NextResponse.json({
    phase: phaseRes.data as string,
    settings: settingsRes.data ?? null,
    categories,
    byCategory,
    entries,
    totals: { votes: totalVotes, entries: entries.length },
  });
}
