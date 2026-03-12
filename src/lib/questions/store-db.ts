/**
 * Database layer for question_versions: CRUD and ownership.
 * One row per immutable version; ownership enforced for create new version / delete.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { compareVersion } from "./version";

export type QuestionVersionStatus = "pending" | "approved";

export interface QuestionVersionRow {
  id: string;
  logical_id: string;
  version: string;
  owner_id: string;
  type: string;
  title: string | null;
  domain: string | null;
  tags: string[] | null;
  prompt_snippet: string | null;
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
  tags?: string[] | null;
  prompt_snippet?: string | null;
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
      tags: row.tags ?? [],
      prompt_snippet: row.prompt_snippet ?? null,
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
 * List all question version rows (no owner filter). Used for sync and for DB-driven question listing.
 */
export async function listAllQuestionVersions(
  supabase: SupabaseClient
): Promise<{ data: QuestionVersionRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("question_versions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { data: [], error };
  return { data: (data ?? []) as QuestionVersionRow[], error: null };
}

const PROMPT_SNIPPET_LENGTH = 200;

/** Strip to plain text and take first N chars for snippet. */
export function makePromptSnippet(prompt: string | null | undefined): string | null {
  if (!prompt || typeof prompt !== "string") return null;
  const plain = prompt.replace(/\s+/g, " ").trim();
  if (!plain) return null;
  return plain.length <= PROMPT_SNIPPET_LENGTH ? plain : plain.slice(0, PROMPT_SNIPPET_LENGTH);
}

/**
 * List approved questions for listing (browse, create-set picker): one per logical_id (latest version).
 * Optional tag filter: only questions whose tags array contains all of the given tags.
 * Optional searchQuery: case-insensitive filter on title, domain, prompt_snippet.
 */
export async function listApprovedQuestionsForListing(
  supabase: SupabaseClient,
  opts: { tags?: string[]; searchQuery?: string } = {}
): Promise<{ data: QuestionVersionRow[]; error: Error | null }> {
  let query = supabase
    .from("question_versions")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (opts.tags?.length) {
    query = query.contains("tags", opts.tags);
  }
  const { data, error } = await query;
  if (error) return { data: [], error };
  let rows = (data ?? []) as QuestionVersionRow[];
  const q = opts.searchQuery?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.domain && r.domain.toLowerCase().includes(q)) ||
        (r.prompt_snippet && r.prompt_snippet.toLowerCase().includes(q))
    );
  }
  rows.sort((a, b) => compareVersion(b.version, a.version));
  const byLogicalId = new Map<string, QuestionVersionRow>();
  for (const row of rows) {
    if (!byLogicalId.has(row.logical_id)) {
      byLogicalId.set(row.logical_id, row);
    }
  }
  return { data: Array.from(byLogicalId.values()), error: null };
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

/**
 * List distinct tag names from approved question versions (for tag filter picker).
 */
export async function listDistinctTags(
  supabase: SupabaseClient
): Promise<{ data: string[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("question_versions")
    .select("tags")
    .eq("status", "approved");
  if (error) return { data: [], error };
  const set = new Set<string>();
  for (const row of (data ?? []) as { tags: string[] | null }[]) {
    const tags = row?.tags;
    if (Array.isArray(tags)) for (const t of tags) if (typeof t === "string" && t.trim()) set.add(t.trim());
  }
  return { data: Array.from(set).sort(), error: null };
}
