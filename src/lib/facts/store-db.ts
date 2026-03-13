/**
 * Canonical facts database layer (SPEC-0.0.8).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FactRow, InsertFact } from "./types";

export async function listFacts(
  supabase: SupabaseClient,
  opts?: { tagPath?: string; limit?: number; offset?: number }
): Promise<{ data: FactRow[]; error: Error | null }> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  let query = supabase.from("facts").select("*").order("updated_at", { ascending: false });
  if (opts?.tagPath != null && opts.tagPath !== "") {
    query = query.eq("tag_path", opts.tagPath);
  }
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) return { data: [], error };
  return { data: (data ?? []) as FactRow[], error: null };
}

export async function searchFactsByText(
  supabase: SupabaseClient,
  q: string,
  opts?: { limit?: number }
): Promise<{ data: FactRow[]; error: Error | null }> {
  const limit = opts?.limit ?? 50;
  const term = q.trim().replace(/\s+/g, " ");
  if (!term) return { data: [], error: null };
  const { data, error } = await supabase
    .from("facts")
    .select("*")
    .ilike("canonical_text", `%${term.replace(/%/g, "\\%")}%`)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [], error };
  return { data: (data ?? []) as FactRow[], error: null };
}

export async function getFactById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: FactRow | null; error: Error | null }> {
  const { data, error } = await supabase.from("facts").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error };
  return { data: data as FactRow | null, error: null };
}

export async function insertFact(
  supabase: SupabaseClient,
  row: InsertFact
): Promise<{ data: FactRow | null; error: Error | null }> {
  const payload: Record<string, unknown> = {
    canonical_text: row.canonical_text,
    tag_path: row.tag_path ?? null,
    subject: row.subject ?? null,
    predicate: row.predicate ?? null,
    object: row.object ?? null,
  };
  if (row.id) payload.id = row.id;
  const { data, error } = await supabase.from("facts").insert(payload).select().single();
  if (error) return { data: null, error };
  return { data: data as FactRow, error: null };
}

export async function updateFact(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<InsertFact>
): Promise<{ data: FactRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("facts")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error };
  return { data: data as FactRow, error: null };
}

export async function deleteFact(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("facts").delete().eq("id", id);
  return { error: error ?? null };
}

export async function getPrerequisiteFactIdsForQuestion(
  supabase: SupabaseClient,
  questionVersionId: string
): Promise<{ data: string[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("question_prerequisite_facts")
    .select("fact_id")
    .eq("question_version_id", questionVersionId);
  if (error) return { data: [], error };
  return {
    data: (data ?? []).map((r: { fact_id: string }) => r.fact_id),
    error: null,
  };
}

export async function setPrerequisiteFactsForQuestion(
  supabase: SupabaseClient,
  questionVersionId: string,
  factIds: string[]
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase
    .from("question_prerequisite_facts")
    .delete()
    .eq("question_version_id", questionVersionId);
  if (delErr) return { error: delErr };
  if (factIds.length === 0) return { error: null };
  const rows = factIds.map((fact_id) => ({ question_version_id: questionVersionId, fact_id }));
  const { error: insErr } = await supabase.from("question_prerequisite_facts").insert(rows);
  return { error: insErr ?? null };
}
