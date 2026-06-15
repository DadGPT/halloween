import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { BUCKET } from "@/lib/constants";

// Create a costume entry: upload the (already client-compressed) photo to
// Supabase Storage, then insert the row. Phase ('closed' blocks) is enforced
// by a DB trigger. Service role is used so this is the single write path.
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("photo");
    const name = String(form.get("name") ?? "").trim();
    const kind = String(form.get("kind") ?? "individual");
    const description = String(form.get("description") ?? "").trim();
    const deviceId = String(form.get("device_id") ?? "").trim();

    if (!name) return bad("Please add a name for your costume.");
    if (!deviceId) return bad("Missing device id.");
    if (kind !== "individual" && kind !== "group") return bad("Invalid type.");
    if (!(file instanceof File) || file.size === 0)
      return bad("Please add a photo.");
    if (!file.type.startsWith("image/")) return bad("That file isn't an image.");

    const supabase = createRouteClient();

    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `${deviceId}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (upErr) return bad(upErr.message, 500);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data, error } = await supabase
      .from("entries")
      .insert({
        name,
        kind,
        description,
        device_id: deviceId,
        photo_path: path,
        photo_url: pub.publicUrl,
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from(BUCKET).remove([path]); // don't orphan the file
      return bad(error.message, 400);
    }

    return NextResponse.json({ entry: data });
  } catch {
    return bad("Something went wrong. Please try again.", 500);
  }
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
