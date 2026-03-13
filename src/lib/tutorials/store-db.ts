/**
 * Tutorials database layer (SPEC-0.0.8).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TutorialRow, InsertTutorial } from "./types";

export async function listTutorials(
  supabase: SupabaseClient,
  opts?: { limit?: number; offset?: number }
): Promise<{ data: TutorialRow[]; error: Error | null }> {
  let query = supabase
    .from("tutorials")
    .select("*")
    .order("updated_at", { ascending: false });
  if (opts?.limit != null) query = query.limit(opts.limit);
  if (opts?.offset != null) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
  const { data, error } = await query;
  if (error) return { data: [], error };
  return { data: (data ?? []) as TutorialRow[], error: null };
}

export async function getTutorialById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: TutorialRow | null; error: Error | null }> {
  const { data, error } = await supabase.from("tutorials").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error };
  return { data: data as TutorialRow | null, error: null };
}

export async function getTutorialFactIds(
  supabase: SupabaseClient,
  tutorialId: string
): Promise<{ data: string[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("tutorial_facts")
    .select("fact_id")
    .eq("tutorial_id", tutorialId);
  if (error) return { data: [], error };
  return {
    data: (data ?? []).map((r: { fact_id: string }) => r.fact_id),
    error: null,
  };
}

export async function getTutorialTagPaths(
  supabase: SupabaseClient,
  tutorialId: string
): Promise<{ data: string[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("tutorial_tag_paths")
    .select("tag_path")
    .eq("tutorial_id", tutorialId);
  if (error) return { data: [], error };
  return {
    data: (data ?? []).map((r: { tag_path: string }) => r.tag_path),
    error: null,
  };
}

export async function insertTutorial(
  supabase: SupabaseClient,
  row: InsertTutorial
): Promise<{ data: TutorialRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("tutorials")
    .insert({
      title: row.title ?? null,
      external_ref: row.external_ref ?? null,
      content_mode: row.content_mode ?? "direct",
      stored_content_path: row.stored_content_path ?? null,
    })
    .select()
    .single();
  if (error) return { data: null, error };
  return { data: data as TutorialRow, error: null };
}

export async function updateTutorial(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<InsertTutorial>
): Promise<{ data: TutorialRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("tutorials")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error };
  return { data: data as TutorialRow, error: null };
}

export async function setTutorialFacts(
  supabase: SupabaseClient,
  tutorialId: string,
  factIds: string[]
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase
    .from("tutorial_facts")
    .delete()
    .eq("tutorial_id", tutorialId);
  if (delErr) return { error: delErr };
  if (factIds.length === 0) return { error: null };
  const rows = factIds.map((fact_id) => ({ tutorial_id: tutorialId, fact_id }));
  const { error: insErr } = await supabase.from("tutorial_facts").insert(rows);
  return { error: insErr ?? null };
}

export async function setTutorialTagPaths(
  supabase: SupabaseClient,
  tutorialId: string,
  tagPaths: string[]
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase
    .from("tutorial_tag_paths")
    .delete()
    .eq("tutorial_id", tutorialId);
  if (delErr) return { error: delErr };
  if (tagPaths.length === 0) return { error: null };
  const rows = tagPaths.map((tag_path) => ({ tutorial_id: tutorialId, tag_path }));
  const { error: insErr } = await supabase.from("tutorial_tag_paths").insert(rows);
  return { error: insErr ?? null };
}

export async function deleteTutorial(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("tutorials").delete().eq("id", id);
  return { error: error ?? null };
}
