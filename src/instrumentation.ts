/**
 * Runs when the Next.js server starts. Syncs filesystem questions into the DB
 * before any user logs in, when using FS storage and QUESTION_SYNC_OWNER_ID.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const useFs = process.env.QUESTIONS_STORAGE !== "supabase";
  const hasSyncOwner = Boolean(process.env.QUESTION_SYNC_OWNER_ID);
  const hasAdminKey =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY
    );

  if (!useFs || !hasSyncOwner || !hasAdminKey) return;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { syncFsWithDb } = await import("@/lib/questions/sync-questions");
    const supabase = createAdminClient();
    const result = await syncFsWithDb(supabase);
    if (
      result.imported > 0 ||
      result.conflictsResolved > 0 ||
      result.errors.length > 0
    ) {
      console.log("[yrS3] Startup question sync:", result);
    }
  } catch (e) {
    console.warn("[yrS3] Startup question sync failed:", e);
  }
}
