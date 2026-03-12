/**
 * Runs when the Next.js server starts. Syncs filesystem questions into the DB
 * before any user logs in, when using FS storage and sync owner (env or default).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const useFs = process.env.QUESTIONS_STORAGE !== "supabase";
  const hasAdminKey =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY
    );

  if (!useFs || !hasAdminKey) return;

  const { getSyncOwnerId } = await import("@/lib/questions/sync-owner");
  const { setSyncStatusRan, setSyncStatusSkipped } = await import(
    "@/lib/questions/sync-status"
  );
  const syncOwnerId = getSyncOwnerId();

  const usingDefaultOwner = !process.env.QUESTION_SYNC_OWNER_ID;
  if (usingDefaultOwner) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const supabase = createAdminClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.admin.getUserById(syncOwnerId);
      if (error || !user) {
        const reason =
          "Default question owner user not found in database. Run supabase db reset (local) or set QUESTION_SYNC_OWNER_ID. Ensure SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY) is set for startup sync. See SETUP/SPEC-DB-FS-QUESTION-SYNC.";
        setSyncStatusSkipped(reason);
        const { reportError } = await import("@/lib/report");
        reportError(new Error(reason), { source: "instrumentation" });
        console.warn("[yrS3] Startup question sync skipped:", reason);
        return;
      }
    } catch (e) {
      const reason =
        "Could not verify default question owner. Run supabase db reset (local) or set QUESTION_SYNC_OWNER_ID. See SETUP/SPEC-DB-FS-QUESTION-SYNC.";
      setSyncStatusSkipped(reason);
      const { reportError } = await import("@/lib/report");
      reportError(e instanceof Error ? e : new Error(String(e)), {
        source: "instrumentation",
      });
      console.warn("[yrS3] Startup question sync skipped:", e);
      return;
    }
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { syncFsWithDb } = await import("@/lib/questions/sync-questions");
    const { syncQuestionSetsFromFs } = await import("@/lib/question-sets/sync-question-sets");
    const supabase = createAdminClient();
    const result = await syncFsWithDb(supabase);
    const setResult = await syncQuestionSetsFromFs(supabase);
    const allErrors = [...result.errors, ...setResult.errors];
    setSyncStatusRan({
      imported: result.imported,
      conflictsResolved: result.conflictsResolved,
      errors: allErrors,
    });
    if (
      result.imported > 0 ||
      result.conflictsResolved > 0 ||
      setResult.imported > 0 ||
      setResult.updated > 0 ||
      allErrors.length > 0
    ) {
      console.log("[yrS3] Startup sync:", {
        questions: result,
        questionSets: setResult,
      });
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    setSyncStatusSkipped(err.message);
    const { reportError } = await import("@/lib/report");
    reportError(err, { source: "instrumentation" });
    console.warn("[yrS3] Startup question sync failed:", e);
  }
}
