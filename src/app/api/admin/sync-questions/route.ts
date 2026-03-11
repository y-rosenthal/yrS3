import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { syncFsWithDb } from "@/lib/questions/sync-questions";
import { setSyncStatusRan } from "@/lib/questions/sync-status";
import { reportError } from "@/lib/report";

/**
 * POST /api/admin/sync-questions
 * Run FS-DB sync (import FS-only, resolve conflicts with DB wins). Requires auth.
 */
export async function POST() {
  try {
    await requireUser();
    const supabase = await createClient();
    const result = await syncFsWithDb(supabase);
    setSyncStatusRan({
      imported: result.imported,
      conflictsResolved: result.conflictsResolved,
      errors: result.errors,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "POST /api/admin/sync-questions",
    });
    return NextResponse.json(
      { error: "Unauthorized or sync failed" },
      { status: 401 }
    );
  }
}
