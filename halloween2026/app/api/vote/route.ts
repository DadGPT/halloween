import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// Cast or change a vote (one per category per device). DB triggers enforce
// phase + self-vote; we pre-check here for friendly messages and to avoid
// clearing the old pick when the new one would be rejected.
export async function POST(request: Request) {
  const { device_id, category_id, entry_id } = await request.json().catch(() => ({}));
  if (!device_id || !category_id || !entry_id) return bad("Missing fields.");

  const supabase = createRouteClient();

  const { data: phase } = await supabase.rpc("current_phase");
  if (phase !== "voting") return bad("Voting isn't open right now.");

  const { data: entry } = await supabase
    .from("entries")
    .select("device_id")
    .eq("id", entry_id)
    .single();
  if (!entry) return bad("That costume is no longer in the contest.");
  if (entry.device_id === device_id) return bad("You can't vote for your own costume.");

  // Replace any existing pick in this category, then insert the new one.
  await supabase
    .from("votes")
    .delete()
    .eq("device_id", device_id)
    .eq("category_id", category_id);

  const { error } = await supabase
    .from("votes")
    .insert({ device_id, category_id, entry_id });
  if (error) return bad(error.message);

  return NextResponse.json({ ok: true });
}

// Clear this device's pick in a category.
export async function DELETE(request: Request) {
  const { device_id, category_id } = await request.json().catch(() => ({}));
  if (!device_id || !category_id) return bad("Missing fields.");

  const supabase = createRouteClient();
  await supabase
    .from("votes")
    .delete()
    .eq("device_id", device_id)
    .eq("category_id", category_id);

  return NextResponse.json({ ok: true });
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
