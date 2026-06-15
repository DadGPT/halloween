import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// Toggle a reaction on an entry (deduped per device/entry/emoji). Allowed in
// any phase — it's lightweight hype, not a ballot. Returns the new count.
export async function POST(request: Request) {
  const { device_id, entry_id, emoji } = await request.json().catch(() => ({}));
  if (!device_id || !entry_id || !emoji)
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });

  const supabase = createRouteClient();

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("device_id", device_id)
    .eq("entry_id", entry_id)
    .eq("emoji", emoji)
    .maybeSingle();

  let active: boolean;
  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    active = false;
  } else {
    await supabase.from("reactions").insert({ device_id, entry_id, emoji });
    active = true;
  }

  const { count } = await supabase
    .from("reactions")
    .select("*", { count: "exact", head: true })
    .eq("entry_id", entry_id)
    .eq("emoji", emoji);

  return NextResponse.json({ active, count: count ?? 0 });
}
