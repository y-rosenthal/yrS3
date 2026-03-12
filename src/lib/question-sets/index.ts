/**
 * Question sets: DB is the source of truth (same approach as questions).
 * Filesystem question-sets/ is imported via sync only; see sync-question-sets.ts and POST /api/admin/sync-questions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listQuestionSetsFromDb, getQuestionSetFromDb } from "./load-db";
import type { QuestionSet, QuestionSetListItem } from "./types";

/** List all question sets from the database only. */
export async function listQuestionSets(supabase: SupabaseClient): Promise<QuestionSetListItem[]> {
  return listQuestionSetsFromDb(supabase);
}

/**
 * Get one question set by id (uuid) or by source_slug (folder name) after sync.
 * Returns null if not in DB — run sync to import from question-sets/ folder.
 */
export async function getQuestionSetById(
  supabase: SupabaseClient,
  id: string
): Promise<QuestionSet | null> {
  return getQuestionSetFromDb(supabase, id);
}

/**
 * Return the uuid to use for test_sessions.set_id and the ordered question logical ids.
 * Set must already exist in DB (create via UI or sync from filesystem).
 */
export async function resolveSetIdForSession(
  supabase: SupabaseClient,
  id: string
): Promise<{ setId: string; questionLogicalIds: string[] } | null> {
  const set = await getQuestionSetFromDb(supabase, id);
  if (!set) return null;
  return { setId: set.id, questionLogicalIds: set.questionLogicalIds };
}

export type { QuestionSet, QuestionSetListItem, QuestionSetFile } from "./types";
export {
  listQuestionSetsFromDb,
  getQuestionSetFromDb,
  insertQuestionSet,
  updateQuestionSet,
} from "./load-db";
export { getQuestionSetsRoot, getQuestionSetFolderPath, parseSetYamlFromContent } from "./load-fs";
export { syncQuestionSetsFromFs } from "./sync-question-sets";
