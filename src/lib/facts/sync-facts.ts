/**
 * Sync facts from filesystem to database (SPEC-0.0.8). DB is source of truth; FS-only facts are imported.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listFactIdsFromFs, readFactFromFs, writeFactToFs } from "./store-fs";
import { getFactById, insertFact, listFacts } from "./store-db";

export interface SyncFactsResult {
  imported: number;
  errors: string[];
}

export async function syncFactsFromFs(supabase: SupabaseClient): Promise<SyncFactsResult> {
  const result: SyncFactsResult = { imported: 0, errors: [] };
  let ids: string[];
  try {
    ids = await listFactIdsFromFs();
  } catch (e) {
    result.errors.push(`List FS: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }

  for (const id of ids) {
    const existing = await getFactById(supabase, id);
    if (existing.data) continue;
    const fact = await readFactFromFs(id);
    if (!fact) {
      result.errors.push(`Read fact ${id}: invalid or missing`);
      continue;
    }
    const { error } = await insertFact(supabase, {
      id: fact.id,
      canonical_text: fact.canonical_text,
      tag_path: fact.tag_path,
      subject: fact.subject,
      predicate: fact.predicate,
      object: fact.object,
    });
    if (error) {
      result.errors.push(`Insert ${id}: ${error.message}`);
      continue;
    }
    result.imported++;
  }

  // Optionally write back DB state to FS for mirror (all facts in batches if needed)
  const { data: dbFacts } = await listFacts(supabase, { limit: 5000 });
  if (dbFacts?.length) {
    for (const fact of dbFacts) {
      try {
        await writeFactToFs(fact);
      } catch (e) {
        result.errors.push(`Write FS ${fact.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return result;
}
