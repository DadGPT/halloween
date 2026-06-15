import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// Past-party photos ("memories"). Public read; uploads are host-only
// (passcode-gated, like the other admin actions).
export const dynamic = "force-dynamic";

const BUCKET = "memories";

export async function GET() {
  const supabase = createRouteClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .order("year", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return NextResponse.json({ memories: data ?? [] });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const passcode = String(form.get("passcode") ?? "");
  const year = String(form.get("year") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  const file = form.get("photo");

  if (!passcode) return bad("Passcode required.");
  const supabase = createRouteClient();
  const { data: ok } = await supabase.rpc("admin_check", { p: passcode });
  if (!ok) return bad("Wrong passcode.", 401);

  if (!year) return bad("Add a year.");
  if (!(file instanceof File) || file.size === 0) return bad("Please add a photo.");
  if (!file.type.startsWith("image/")) return bad("That file isn't an image.");

  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${year}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type });
  if (upErr) return bad(upErr.message, 500);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error } = await supabase.rpc("admin_add_memory", {
    p: passcode,
    y: year,
    cap: caption,
    ppath: path,
    purl: pub.publicUrl,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return bad(error.message);
  }
  return NextResponse.json({ ok: true });
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
