import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// Single source of truth for the client: current phase, settings, categories.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createRouteClient();
    const [settingsRes, phaseRes, categoriesRes] = await Promise.all([
      supabase.from("contest_settings").select("*").eq("id", 1).single(),
      supabase.rpc("current_phase"),
      supabase
        .from("categories")
        .select("*")
        .eq("active", true)
        .order("sort_order"),
    ]);

    return NextResponse.json({
      phase: (phaseRes.data as string) ?? "preshow",
      settings: settingsRes.data ?? null,
      categories: categoriesRes.data ?? [],
    });
  } catch {
    return NextResponse.json(
      { phase: "preshow", settings: null, categories: [] },
      { status: 200 },
    );
  }
}
