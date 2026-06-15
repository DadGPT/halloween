import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// Karaoke queue. Max 2 songs per device is enforced by a DB trigger.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createRouteClient();
  const { data } = await supabase
    .from("karaoke_songs")
    .select("*")
    .order("position", { ascending: true });
  return NextResponse.json({ songs: data ?? [] });
}

export async function POST(request: Request) {
  const { device_id, singer, title, artist } = await request
    .json()
    .catch(() => ({}));
  if (!device_id) return bad("Missing device id.");
  if (!singer?.trim() || !title?.trim())
    return bad("Add who's singing and the song title.");

  const supabase = createRouteClient();
  const { error } = await supabase.from("karaoke_songs").insert({
    device_id,
    singer: singer.trim().slice(0, 60),
    title: title.trim().slice(0, 80),
    artist: (artist ?? "").trim().slice(0, 60),
  });
  // The limit trigger raises a friendly message; pass it straight through.
  if (error) return bad(error.message);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { device_id, id } = await request.json().catch(() => ({}));
  if (!device_id || !id) return bad("Missing fields.");
  const supabase = createRouteClient();
  await supabase
    .from("karaoke_songs")
    .delete()
    .eq("id", id)
    .eq("device_id", device_id); // can only remove your own
  return NextResponse.json({ ok: true });
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
