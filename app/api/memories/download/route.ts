import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// Streams a memory photo back with Content-Disposition: attachment so phones
// reliably save it to the device (cross-origin `download` attrs get ignored).
export const dynamic = "force-dynamic";

const BUCKET = "memories";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = createRouteClient();
  const { data: m } = await supabase
    .from("memories")
    .select("photo_path, year")
    .eq("id", id)
    .maybeSingle();
  if (!m?.photo_path)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: blob, error } = await supabase.storage
    .from(BUCKET)
    .download(m.photo_path);
  if (error || !blob)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const buf = Buffer.from(await blob.arrayBuffer());
  const ext = m.photo_path.split(".").pop() || "jpg";
  const filename = `halloween-${m.year}-${id.slice(0, 8)}.${ext}`;

  return new Response(buf, {
    headers: {
      "Content-Type": blob.type || "image/jpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
