/**
 * Question sets: list and get from DB and/or filesystem (SPEC-QUESTION-SETS-0.0.2).
 * Merges DB + file-based sets when listing; getById checks DB then FS.
 * For "take as test" we need a DB set id (uuid); file-based sets are materialized into DB on first take.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listQuestionSetsFromDb, getQuestionSetFromDb, insertQuestionSet } from "./load-db";
import { listQuestionSetsFromFs, getQuestionSetFromFs } from "./load-fs";
import type { QuestionSet, QuestionSetListItem } from "./types";

/** List all question sets from DB and filesystem (file-based only if QUESTION_SETS_ROOT or default path exists). */
export async function listQuestionSets(supabase: SupabaseClient): Promise<QuestionSetListItem[]> {
  const fromDb = await listQuestionSetsFromDb(supabase);
  const fromFs = await listQuestionSetsFromFs();
  const byId = new Map<string, QuestionSetListItem>();
  for (const s of fromDb) byId.set(s.id, s);
  for (const s of fromFs) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );
}

/** Get one question set by id (string: uuid or file-based slug). Checks DB first, then FS. */
export async function getQuestionSetById(
  supabase: SupabaseClient,
  id: string
): Promise<QuestionSet | null> {
  const fromDb = await getQuestionSetFromDb(supabase, id);
  if (fromDb) return fromDb;
  return getQuestionSetFromFs(id);
}

/**
 * Return the uuid to use for test_sessions.set_id and the ordered question logical ids.
 * If the set is in DB, use its id. If it's file-based, materialize it into DB and return the new uuid.
 */
export async function resolveSetIdForSession(
  supabase: SupabaseClient,
  id: string
): Promise<{ setId: string; questionLogicalIds: string[] } | null> {
  const set = await getQuestionSetById(supabase, id);
  if (!set) return null;
  if (set.source === "db") {
    return { setId: set.id, questionLogicalIds: set.questionLogicalIds };
  }
  const created = await insertQuestionSet(supabase, {
    title: set.title,
    description: set.description,
    questionLogicalIds: set.questionLogicalIds,
  });
  if (!created) return null;
  return { setId: created.id, questionLogicalIds: created.questionLogicalIds };
}

export type { QuestionSet, QuestionSetListItem };
export { listQuestionSetsFromDb, getQuestionSetFromDb, insertQuestionSet } from "./load-db";
export { listQuestionSetsFromFs, getQuestionSetFromFs } from "./load-fs";
