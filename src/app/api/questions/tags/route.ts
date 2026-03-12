import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listDistinctTags } from "@/lib/questions/store-db";
import { reportError } from "@/lib/report";

export async function GET() {
  try {
    await requireUser();
    const supabase = await createClient();
    const { data, error } = await listDistinctTags(supabase);
    if (error) {
      return NextResponse.json({ error: "Failed to list tags" }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "GET /api/questions/tags",
    });
    return NextResponse.json({ error: "Unauthorized or failed" }, { status: 401 });
  }
}
