/**
 * Tags taxonomy database layer (SPEC-0.0.8).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TagRow, InsertTag } from "./types";

export async function listTags(
  supabase: SupabaseClient
): Promise<{ data: TagRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("path", { ascending: true });
  if (error) return { data: [], error };
  return { data: (data ?? []) as TagRow[], error: null };
}

export async function getTagByPath(
  supabase: SupabaseClient,
  path: string
): Promise<{ data: TagRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("path", path)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as TagRow | null, error: null };
}

export async function getTagById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: TagRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as TagRow | null, error: null };
}

export async function searchTagsByPathPrefix(
  supabase: SupabaseClient,
  prefix: string
): Promise<{ data: TagRow[]; error: Error | null }> {
  const pattern = prefix.endsWith("/") ? `${prefix}%` : `${prefix}/%`;
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .like("path", pattern)
    .order("path", { ascending: true });
  if (error) return { data: [], error };
  return { data: (data ?? []) as TagRow[], error: null };
}

export async function insertTag(
  supabase: SupabaseClient,
  row: InsertTag
): Promise<{ data: TagRow | null; error: Error | null }> {
  const payload: Record<string, unknown> = {
    name: row.name,
    parent_id: row.parent_id ?? null,
    path: row.path,
  };
  if (row.id) payload.id = row.id;
  const { data, error } = await supabase.from("tags").insert(payload).select().single();
  if (error) return { data: null, error };
  return { data: data as TagRow, error: null };
}

export async function upsertTag(
  supabase: SupabaseClient,
  row: InsertTag & { id?: string }
): Promise<{ data: TagRow | null; error: Error | null }> {
  const payload = {
    name: row.name,
    parent_id: row.parent_id ?? null,
    path: row.path,
    updated_at: new Date().toISOString(),
  };
  if (row.id) {
    const { data, error } = await supabase
      .from("tags")
      .update(payload)
      .eq("id", row.id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: data as TagRow, error: null };
  }
  return insertTag(supabase, row);
}

export async function deleteTag(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  return { error: error ?? null };
}
