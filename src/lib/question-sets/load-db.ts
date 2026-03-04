/**
 * Load and persist question sets in the database (SPEC-QUESTION-SETS-0.0.2).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionSet, QuestionSetListItem } from "./types";

export interface QuestionSetRow {
  id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  created_at: string;
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
    .select("id, title, description")
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
    source: "db" as const,
  }));
}

export async function getQuestionSetFromDb(
  supabase: SupabaseClient,
  id: string
): Promise<QuestionSet | null> {
  const { data: row, error } = await supabase
    .from("question_sets")
    .select("id, title, description")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) return null;

  const { data: items, error: itemsError } = await supabase
    .from("question_set_items")
    .select("question_logical_id, position")
    .eq("question_set_id", id)
    .order("position", { ascending: true });
  if (itemsError) return null;

  const questionLogicalIds = (items ?? [])
    .map((i) => (i as QuestionSetItemRow).question_logical_id);

  return {
    id: (row as QuestionSetRow).id,
    title: (row as QuestionSetRow).title,
    description: (row as QuestionSetRow).description,
    questionLogicalIds,
    source: "db",
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
    questionLogicalIds: string[];
    ownerId?: string | null;
  }
): Promise<QuestionSet | null> {
  const { data: setRow, error: setError } = await supabase
    .from("question_sets")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      owner_id: payload.ownerId ?? null,
    })
    .select("id, title, description")
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

  return {
    id: setId,
    title: (setRow as QuestionSetRow).title,
    description: (setRow as QuestionSetRow).description,
    questionLogicalIds: payload.questionLogicalIds,
    source: "db",
  };
}
