/**
 * Load and persist question sets in the database (SPEC-QUESTION-SETS-0.0.2).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionSet, QuestionSetFile, QuestionSetListItem } from "./types";

export interface QuestionSetRow {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  owner_id: string | null;
  created_at: string;
  sandbox_zip_ref?: string | null;
  source_slug?: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id.trim());
}

export interface QuestionSetItemRow {
  id: string;
  question_set_id: string;
  question_logical_id: string;
  position: number;
}

export async function listQuestionSetsFromDb(
  supabase: SupabaseClient
): Promise<QuestionSetListItem[]> {
  const { data: sets, error } = await supabase
    .from("question_sets")
    .select("id, title, description, instructions, sandbox_zip_ref, source_slug")
    .order("created_at", { ascending: false });
  if (error || !sets?.length) return [];

  const { data: counts } = await supabase
    .from("question_set_items")
    .select("question_set_id");
  const countBySet = (counts ?? []).reduce<Record<string, number>>((acc, row) => {
    const id = (row as { question_set_id: string }).question_set_id;
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});

  return (sets as QuestionSetRow[]).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    questionCount: countBySet[s.id] ?? 0,
    sourceSlug: s.source_slug ?? null,
  }));
}

export async function getQuestionSetFromDb(
  supabase: SupabaseClient,
  id: string
): Promise<QuestionSet | null> {
  const idTrimmed = id.trim();
  const query = supabase
    .from("question_sets")
    .select("id, title, description, instructions, sandbox_zip_ref, source_slug");
  const { data: row, error } = isUuid(idTrimmed)
    ? await query.eq("id", idTrimmed).maybeSingle()
    : await query.eq("source_slug", idTrimmed).maybeSingle();
  if (error || !row) return null;

  const setId = (row as QuestionSetRow).id;

  const { data: items, error: itemsError } = await supabase
    .from("question_set_items")
    .select("question_logical_id, position")
    .eq("question_set_id", setId)
    .order("position", { ascending: true });
  if (itemsError) return null;

  const { data: fileRows } = await supabase
    .from("question_set_files")
    .select("id, filename, description, stored_path")
    .eq("question_set_id", setId);
  const files: QuestionSetFile[] = (fileRows ?? []).map((f) => ({
    id: (f as { id: string }).id,
    filename: (f as { filename: string }).filename,
    description: (f as { description: string | null }).description ?? null,
    storedPath: (f as { stored_path: string }).stored_path,
  }));

  const questionLogicalIds = (items ?? [])
    .map((i) => (i as QuestionSetItemRow).question_logical_id);
  const r = row as QuestionSetRow;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    instructions: r.instructions ?? null,
    questionLogicalIds,
    sandboxZipRef: r.sandbox_zip_ref ?? null,
    files,
    sourceSlug: r.source_slug ?? null,
  };
}

/**
 * Insert a new question set and its items. Returns the created set or null on error.
 * Used for UI "create" and for materializing a file-based set when taking as test.
 */
export async function insertQuestionSet(
  supabase: SupabaseClient,
  payload: {
    title: string;
    description?: string | null;
    instructions?: string | null;
    questionLogicalIds: string[];
    ownerId?: string | null;
    sandboxZipRef?: string | null;
    sourceSlug?: string | null;
  }
): Promise<QuestionSet | null> {
  const { data: setRow, error: setError } = await supabase
    .from("question_sets")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      instructions: payload.instructions ?? null,
      owner_id: payload.ownerId ?? null,
      sandbox_zip_ref: payload.sandboxZipRef ?? null,
      ...(payload.sourceSlug != null && payload.sourceSlug !== ""
        ? { source_slug: payload.sourceSlug }
        : {}),
    })
    .select("id, title, description, instructions, sandbox_zip_ref")
    .single();
  if (setError || !setRow) return null;

  const setId = (setRow as QuestionSetRow).id;
  if (payload.questionLogicalIds.length > 0) {
    const rows = payload.questionLogicalIds.map((logicalId, i) => ({
      question_set_id: setId,
      question_logical_id: logicalId,
      position: i + 1,
    }));
    const { error: itemsError } = await supabase.from("question_set_items").insert(rows);
    if (itemsError) {
      await supabase.from("question_sets").delete().eq("id", setId);
      return null;
    }
  }

  const r = setRow as QuestionSetRow;
  return {
    id: setId,
    title: r.title,
    description: r.description,
    instructions: r.instructions ?? null,
    questionLogicalIds: payload.questionLogicalIds,
    sandboxZipRef: r.sandbox_zip_ref ?? null,
    files: [],
    sourceSlug: payload.sourceSlug ?? null,
  };
}

/**
 * Update a question set (e.g. instructions). Only updates provided fields.
 */
export async function updateQuestionSet(
  supabase: SupabaseClient,
  id: string,
  updates: { instructions?: string | null }
): Promise<boolean> {
  const { error } = await supabase
    .from("question_sets")
    .update({
      ...(updates.instructions !== undefined && { instructions: updates.instructions ?? null }),
    })
    .eq("id", id);
  return !error;
}
