/**
 * Sync filesystem question versions with the database. DB wins on conflict.
 * - FS-only: import into DB (with QUESTION_SYNC_OWNER_ID), write db_meta.yaml to FS.
 * - In both and different: move FS version to _conflicts, write DB version to FS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { getQuestionStore } from "./get-store";
import { listAllQuestionVersions } from "./store-db";
import type { QuestionVersionRow } from "./store-db";
import { insertQuestionVersion } from "./store-db";
import {
  getQuestionsRootPath,
  listVersionKeysFromFs,
  readVersionFilesFromFs,
} from "./store-fs";
import { writeDbMeta, readDbMeta } from "./db-meta-fs";
import { writeQuestionVersionToFs } from "./write-to-fs";
import { parseQuestion } from "./parse";
import { serializeParsedQuestion } from "./serialize";

const CONFLICTS_DIR = "_conflicts";

function versionDir(root: string, logicalId: string, version: string): string {
  return path.join(root, logicalId, version);
}

function conflictsSubDir(root: string, logicalId: string, version: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(root, CONFLICTS_DIR, logicalId, `${version}_${timestamp}`);
}

export interface SyncResult {
  imported: number;
  conflictsResolved: number;
  errors: string[];
}

/**
 * Sync FS with DB. Requires QUESTION_SYNC_OWNER_ID for importing FS-only items.
 * Uses getQuestionsRootPath() as the FS root; excludes _conflicts.
 */
export async function syncFsWithDb(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, conflictsResolved: 0, errors: [] };
  const syncOwnerId = process.env.QUESTION_SYNC_OWNER_ID;
  const root = getQuestionsRootPath();

  const { data: dbRows, error: dbErr } = await listAllQuestionVersions(supabase);
  if (dbErr) {
    result.errors.push(`List DB: ${dbErr.message}`);
    return result;
  }
  const dbSet = new Set<string>();
  const dbMap = new Map<string, QuestionVersionRow>();
  for (const row of dbRows) {
    const key = `${row.logical_id}\0${row.version}`;
    dbSet.add(key);
    dbMap.set(key, row);
  }

  let fsKeys: { logicalId: string; version: string }[];
  try {
    fsKeys = await listVersionKeysFromFs(root);
  } catch (e) {
    result.errors.push(`List FS: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  const store = await getQuestionStore();

  for (const { logicalId, version } of fsKeys) {
    const key = `${logicalId}\0${version}`;
    const dbRow = dbMap.get(key);

    if (!dbRow) {
      // FS-only: import into DB
      if (!syncOwnerId) {
        result.errors.push(`QUESTION_SYNC_OWNER_ID not set; skip import ${logicalId}/${version}`);
        continue;
      }
      const files = await readVersionFilesFromFs(root, logicalId, version);
      if (!files || files.length === 0) {
        result.errors.push(`Could not read FS ${logicalId}/${version}`);
        continue;
      }
      const { question, error: parseErr } = parseQuestion(logicalId, files);
      if (parseErr || !question) {
        result.errors.push(`Parse ${logicalId}/${version}: ${parseErr ?? "invalid"}`);
        continue;
      }
      const storagePath = `${logicalId}/${version}`;
      const { error: insertErr } = await insertQuestionVersion(supabase, {
        logical_id: logicalId,
        version,
        owner_id: syncOwnerId,
        type: question.type,
        title: question.title ?? null,
        domain: question.domain ?? null,
        storage_path: storagePath,
        status: "approved",
        proposed_by: null,
      });
      if (insertErr) {
        result.errors.push(`Insert ${logicalId}/${version}: ${insertErr.message}`);
        continue;
      }
      await writeDbMeta(root, logicalId, version, {
        owner_id: syncOwnerId,
        status: "approved",
        proposed_by: null,
      });
      result.imported++;
      continue;
    }

    // In both: compare; if different, DB wins
    const fsFiles = await readVersionFilesFromFs(root, logicalId, version);
    if (!fsFiles) continue;
    const { question: fsQuestion } = parseQuestion(logicalId, fsFiles);
    const fsMeta = fsQuestion
      ? {
          type: fsQuestion.type,
          title: fsQuestion.title ?? null,
          domain: fsQuestion.domain ?? null,
        }
      : null;
    const dbMeta = {
      type: dbRow.type,
      title: dbRow.title ?? null,
      domain: dbRow.domain ?? null,
    };
    let fsDbMeta = await readDbMeta(root, logicalId, version);
    const sameMeta =
      fsMeta &&
      fsMeta.type === dbMeta.type &&
      fsMeta.title === dbMeta.title &&
      fsMeta.domain === dbMeta.domain &&
      (!fsDbMeta ||
        (fsDbMeta.owner_id === dbRow.owner_id &&
          fsDbMeta.status === dbRow.status &&
          fsDbMeta.proposed_by === dbRow.proposed_by));
    if (sameMeta) continue;

    // DB wins: load content first (store may read from FS), then move FS to conflicts, then write DB version
    const content = await store.get(logicalId, version);
    if (!content) {
      result.errors.push(`Store.get ${logicalId}/${version} returned null`);
      continue;
    }

    const dir = versionDir(root, logicalId, version);
    const conflictDest = conflictsSubDir(root, logicalId, version);
    try {
      await fs.mkdir(path.dirname(conflictDest), { recursive: true });
      await fs.rename(dir, conflictDest);
    } catch (e) {
      result.errors.push(
        `Move to conflicts ${logicalId}/${version}: ${e instanceof Error ? e.message : String(e)}`
      );
      continue;
    }
    const now = new Date().toISOString();
    const { files: contentFiles } = serializeParsedQuestion(content, {
      logicalId,
      version,
      created_at: dbRow.created_at ?? now,
      modified_at: now,
    });
    await writeQuestionVersionToFs({
      root,
      logicalId,
      version,
      dbRow: {
        owner_id: dbRow.owner_id,
        status: dbRow.status,
        proposed_by: dbRow.proposed_by,
      },
      contentFiles,
    });
    result.conflictsResolved++;
  }

  return result;
}
