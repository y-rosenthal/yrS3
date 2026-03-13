import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncFsWithDb } from "@/lib/questions/sync-questions";
import { syncQuestionSetsFromFs } from "@/lib/question-sets/sync-question-sets";
import { syncTagsFromFs } from "@/lib/tags/sync-tags";
import { syncFactsFromFs } from "@/lib/facts/sync-facts";
import { setSyncStatusRan } from "@/lib/questions/sync-status";
import { reportError } from "@/lib/report";

/**
 * POST /api/admin/sync-questions
 * Run FS-DB sync for questions, question sets, tags, and facts. Requires auth.
 */
export async function POST() {
  try {
    await requireUser();
    const supabase = createAdminClient();
    const result = await syncFsWithDb(supabase);
    const setSyncResult = await syncQuestionSetsFromFs(supabase);
    const tagsResult = await syncTagsFromFs(supabase);
    const factsResult = await syncFactsFromFs(supabase);
    const allErrors = [
      ...result.errors,
      ...setSyncResult.errors,
      ...tagsResult.errors,
      ...factsResult.errors,
    ];
    setSyncStatusRan({
      imported: result.imported,
      conflictsResolved: result.conflictsResolved,
      errors: allErrors,
    });
    return NextResponse.json({
      ...result,
      questionSetImported: setSyncResult.imported,
      questionSetUpdated: setSyncResult.updated,
      tagsImported: tagsResult.imported,
      factsImported: factsResult.imported,
      errors: allErrors,
    });
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
