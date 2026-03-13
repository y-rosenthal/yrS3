/**
 * Write a full question version (content files + db_meta.yaml) to the filesystem.
 * Used for dual-write after DB insert and for sync when DB wins.
 */

import fs from "fs/promises";
import path from "path";
import type { QuestionVersionRow } from "./store-db";
import { getEffectiveOwner } from "./store-db";
import { getVersionDirPath, writeDbMeta } from "./db-meta-fs";

export interface ContentFile {
  name: string;
  content: string;
}

export interface WriteQuestionVersionToFsOptions {
  /** Root directory for questions (e.g. QUESTIONS_ROOT or QUESTIONS_FS_BACKUP_ROOT). */
  root: string;
  logicalId: string;
  version: string;
  /** DB row for owner_id, status, proposed_by (written to db_meta.yaml). */
  dbRow: Pick<QuestionVersionRow, "owner_id" | "status" | "proposed_by">;
  /** Content files (meta.yaml, prompt.md, options.yaml, etc.) — question content only. */
  contentFiles: ContentFile[];
}

/**
 * Write a question version folder to the filesystem: all content files plus db_meta.yaml.
 * Creates the version directory and overwrites existing files there.
 */
export async function writeQuestionVersionToFs(
  options: WriteQuestionVersionToFsOptions
): Promise<void> {
  const { root, logicalId, version, dbRow, contentFiles } = options;
  const dir = getVersionDirPath(root, logicalId, version);
  await fs.mkdir(dir, { recursive: true });
  for (const f of contentFiles) {
    await fs.writeFile(path.join(dir, f.name), f.content, "utf-8");
  }
  await writeDbMeta(root, logicalId, version, {
    owner_id: getEffectiveOwner(dbRow) ?? "",
    status: dbRow.status,
    proposed_by: dbRow.proposed_by,
  });
}
