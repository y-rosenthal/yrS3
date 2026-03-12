/**
 * After persisting a question version to the DB, write app metadata (and optionally full mirror) to FS.
 * - FS storage: write db_meta.yaml to the version folder (content already written by store.write).
 * - Supabase storage + backup root: write full version (content + db_meta.yaml) to backup root.
 */

import { getQuestionsRootPath, getQuestionsFsBackupRoot } from "./store-fs";
import { writeDbMeta } from "./db-meta-fs";
import { writeQuestionVersionToFs } from "./write-to-fs";
import type { QuestionVersionRow } from "./store-db";
import { getEffectiveOwner } from "./store-db";

export interface DualWriteParams {
  logicalId: string;
  version: string;
  dbRow: Pick<QuestionVersionRow, "owner_id" | "status" | "proposed_by">;
  /** When provided and storage is Supabase with backup root, writes full version to backup. */
  contentFiles?: { name: string; content: string }[];
}

/**
 * Write db_meta.yaml (and when applicable full version to backup) after a DB insert/update.
 * Call after insertQuestionVersion or after approve. Does not throw; logs and ignores FS errors.
 */
export async function dualWriteToFs(params: DualWriteParams): Promise<void> {
  const { logicalId, version, dbRow } = params;
  const isSupabase = process.env.QUESTIONS_STORAGE === "supabase";

  const effectiveOwner = getEffectiveOwner(dbRow) ?? "";
  const meta = { owner_id: effectiveOwner, status: dbRow.status, proposed_by: dbRow.proposed_by };

  if (!isSupabase) {
    const root = getQuestionsRootPath();
    try {
      await writeDbMeta(root, logicalId, version, meta);
    } catch (_e) {
      // best-effort; do not fail the request
    }
    return;
  }

  const backupRoot = getQuestionsFsBackupRoot();
  if (!backupRoot) return;

  if (params.contentFiles && params.contentFiles.length > 0) {
    try {
      await writeQuestionVersionToFs({
        root: backupRoot,
        logicalId,
        version,
        dbRow: { ...dbRow, owner_id: effectiveOwner },
        contentFiles: params.contentFiles,
      });
    } catch (_e) {
      // best-effort
    }
  } else {
    try {
      await writeDbMeta(backupRoot, logicalId, version, meta);
    } catch (_e) {
      // best-effort (e.g. approve flow: only update db_meta)
    }
  }
}
