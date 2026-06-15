import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { BUCKET } from "@/lib/constants";

// Host actions. Every action is passcode-verified, then performed via a
// SECURITY DEFINER RPC that re-checks the passcode in the database (so the
// privilege never depends on this handler alone).
export async function POST(request: Request) {
  const { passcode, action, payload } = await request.json().catch(() => ({}));
  if (!passcode)
    return NextResponse.json({ error: "Passcode required." }, { status: 400 });

  const supabase = createRouteClient();
  const { data: ok } = await supabase.rpc("admin_check", { p: passcode });
  if (!ok)
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });

  try {
    switch (action) {
      case "auth":
        break;
      case "set_phase":
        await run(supabase.rpc("admin_set_phase", { p: passcode, new_phase: payload?.phase }));
        break;
      case "set_revealed":
        await run(supabase.rpc("admin_set_revealed", { p: passcode, val: !!payload?.revealed }));
        break;
      case "reset_votes":
        await run(supabase.rpc("admin_reset_votes", { p: passcode }));
        break;
      case "delete_entry": {
        const id = payload?.id;
        if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
        const { data: e } = await supabase
          .from("entries")
          .select("photo_path")
          .eq("id", id)
          .maybeSingle();
        await run(supabase.rpc("admin_delete_entry", { p: passcode, eid: id }));
        if (e?.photo_path) await supabase.storage.from(BUCKET).remove([e.photo_path]);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function run(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}
