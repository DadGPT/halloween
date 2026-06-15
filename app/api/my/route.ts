import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// This device's ballot: which entry it picked per category, and which
// reactions it has toggled on. Drives the voter's "you voted" UI state.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const deviceId = new URL(request.url).searchParams.get("device_id");
  if (!deviceId) return NextResponse.json({ votes: {}, reactions: [] });

  const supabase = createRouteClient();
  const [votesRes, reactionsRes] = await Promise.all([
    supabase.from("votes").select("category_id, entry_id").eq("device_id", deviceId),
    supabase.from("reactions").select("entry_id, emoji").eq("device_id", deviceId),
  ]);

  const votes: Record<string, string> = {};
  for (const v of votesRes.data ?? []) votes[v.category_id] = v.entry_id;

  return NextResponse.json({
    votes,
    reactions: (reactionsRes.data ?? []).map((r) => `${r.entry_id}:${r.emoji}`),
  });
}
