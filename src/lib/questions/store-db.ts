/**
 * Database layer for question_versions: CRUD and ownership.
 * One row per immutable version; ownership enforced for create new version / delete.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type QuestionVersionStatus = "pending" | "approved";

export interface QuestionVersionRow {
  id: string;
  logical_id: string;
  version: string;
  owner_id: string;
  type: string;
  title: string | null;
  domain: string | null;
  storage_path: string;
  status: QuestionVersionStatus;
  proposed_by: string | null;
  created_at: string;
}

export interface InsertQuestionVersion {
  logical_id: string;
  version: string;
  owner_id: string;
  type: string;
  title?: string | null;
  domain?: string | null;
  storage_path: string;
  status?: QuestionVersionStatus;
  proposed_by?: string | null;
}

/**
 * Insert a new question version row. Caller must ensure ownership for logical_id.
 */
export async function insertQuestionVersion(
  supabase: SupabaseClient,
  row: InsertQuestionVersion
): Promise<{ data: QuestionVersionRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("question_versions")
    .insert({
      logical_id: row.logical_id,
      version: row.version,
      owner_id: row.owner_id,
      type: row.type,
      title: row.title ?? null,
      domain: row.domain ?? null,
      storage_path: row.storage_path,
      status: row.status ?? "approved",
      proposed_by: row.proposed_by ?? null,
    })
    .select()
    .single();
  if (error) return { data: null, error };
  return { data: data as QuestionVersionRow, error: null };
}

/**
 * List all version rows for an owner. Returns rows ordered by created_at desc.
 * For "my questions" UI, consumer can group by logical_id and take latest per group.
 */
export async function listQuestionVersionsByOwner(
  supabase: SupabaseClient,
  ownerId: string
): Promise<{ data: QuestionVersionRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("question_versions")
    .select("*")
    .eq("owner_id", ownerId)
    .in("status", ["approved", "pending"])
    .order("created_at", { ascending: false });
  if (error) return { data: [], error };
  return { data: (data ?? []) as QuestionVersionRow[], error: null };
}

/**
 * Get a specific version by logical_id and version string.
 */
export async function getQuestionVersion(
  supabase: SupabaseClient,
  logicalId: string,
  version: string
): Promise<{ data: QuestionVersionRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("question_versions")
    .select("*")
    .eq("logical_id", logicalId)
    .eq("version", version)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as QuestionVersionRow | null, error: null };
}

/**
 * Get the latest approved version row for a logical_id (by version string sort).
 * Only approved versions are "official"; pending versions are not used for tests.
 */
export async function getLatestQuestionVersion(
  supabase: SupabaseClient,
  logicalId: string
): Promise<{ data: QuestionVersionRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("question_versions")
    .select("*")
    .eq("logical_id", logicalId)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: data as QuestionVersionRow | null, error: null };
}

/**
 * Get the owner of a question (owner_id of the latest approved version, or any version if none approved).
 */
export async function getQuestionOwner(
  supabase: SupabaseClient,
  logicalId: string
): Promise<string | null> {
  const { data: approved } = await supabase
    .from("question_versions")
    .select("owner_id")
    .eq("logical_id", logicalId)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (approved?.owner_id) return (approved as { owner_id: string }).owner_id;
  const { data: anyRow } = await supabase
    .from("question_versions")
    .select("owner_id")
    .eq("logical_id", logicalId)
    .limit(1)
    .maybeSingle();
  return anyRow ? (anyRow as { owner_id: string }).owner_id : null;
}

/**
 * List pending versions that need approval by this owner (owner_id = ownerId, status = 'pending').
 */
export async function listPendingVersionsForOwner(
  supabase: SupabaseClient,
  ownerId: string
): Promise<{ data: QuestionVersionRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("question_versions")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return { data: [], error };
  return { data: (data ?? []) as QuestionVersionRow[], error: null };
}

/**
 * Approve a pending version (only owner may approve). Sets status to 'approved'.
 */
export async function approveVersion(
  supabase: SupabaseClient,
  logicalId: string,
  version: string,
  ownerId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("question_versions")
    .update({ status: "approved" })
    .eq("logical_id", logicalId)
    .eq("version", version)
    .eq("owner_id", ownerId)
    .eq("status", "pending");
  return { error: error ?? null };
}

/**
 * Check whether the user owns at least one version of this question (and thus can create new versions or delete).
 */
export async function isOwnerOfQuestion(
  supabase: SupabaseClient,
  logicalId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("question_versions")
    .select("id")
    .eq("logical_id", logicalId)
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  return !error && data != null;
}

/**
 * List distinct logical_ids for an owner with their latest approved version (one row per logical_id).
 * Only approved versions count as "my questions".
 */
export async function listMyQuestionsWithLatest(
  supabase: SupabaseClient,
  ownerId: string
): Promise<{ data: QuestionVersionRow[]; error: Error | null }> {
  const { data: all, error } = await supabase
    .from("question_versions")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "approved")
    .order("version", { ascending: false });
  if (error) return { data: [], error };
  const seen = new Set<string>();
  const latest: QuestionVersionRow[] = [];
  for (const row of (all ?? []) as QuestionVersionRow[]) {
    if (!seen.has(row.logical_id)) {
      seen.add(row.logical_id);
      latest.push(row);
    }
  }
  return { data: latest, error: null };
}
