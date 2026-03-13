/**
 * Sync tags from filesystem to database (SPEC-0.0.8). DB is source of truth; FS-only tags are imported.
 * After sync, FS mirror is updated from DB so both stay in sync.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { readTaxonomyFromFs, writeTaxonomyToFs } from "./store-fs";
import { listTags, insertTag } from "./store-db";
import type { TagRow } from "./types";

export interface SyncTagsResult {
  imported: number;
  errors: string[];
}

export async function syncTagsFromFs(supabase: SupabaseClient): Promise<SyncTagsResult> {
  const result: SyncTagsResult = { imported: 0, errors: [] };
  let fsTags: TagRow[];
  try {
    fsTags = await readTaxonomyFromFs();
  } catch (e) {
    result.errors.push(`Read FS: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  const { data: dbTags, error: listErr } = await listTags(supabase);
  if (listErr) {
    result.errors.push(`List DB: ${listErr.message}`);
    return result;
  }
  const dbByPath = new Map<string, TagRow>();
  for (const t of dbTags ?? []) {
    dbByPath.set(t.path, t);
  }

  for (const tag of fsTags) {
    if (dbByPath.has(tag.path)) continue;
    const { error: insErr } = await insertTag(supabase, {
      id: tag.id,
      name: tag.name,
      parent_id: tag.parent_id,
      path: tag.path,
    });
    if (insErr) {
      result.errors.push(`Insert ${tag.path}: ${insErr.message}`);
      continue;
    }
    result.imported++;
  }

  const { data: afterTags } = await listTags(supabase);
  if (afterTags?.length) {
    try {
      await writeTaxonomyToFs(afterTags);
    } catch (e) {
      result.errors.push(`Write FS mirror: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
