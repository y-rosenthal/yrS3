import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { syncFsWithDb } from "@/lib/questions/sync-questions";

/**
 * POST /api/admin/sync-questions
 * Run FS-DB sync (import FS-only, resolve conflicts with DB wins). Requires auth.
 */
export async function POST() {
  try {
    await requireUser();
    const supabase = await createClient();
    const result = await syncFsWithDb(supabase);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json(
      { error: "Unauthorized or sync failed" },
      { status: 401 }
    );
  }
}
