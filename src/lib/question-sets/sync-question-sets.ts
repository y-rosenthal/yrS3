/**
 * Sync question sets from filesystem into the database (same approach as questions sync).
 * FS is import-only; listing and take flow use DB only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { getQuestionSetsRoot, parseSetYamlFromContent } from "./load-fs";
import * as fileStorage from "./file-storage";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SyncQuestionSetsResult {
  imported: number;
  updated: number;
  errors: string[];
}

/**
 * Walk question-sets root; for each valid set.yaml upsert into question_sets and replace items.
 * Attached files under files/ are copied into data/question-set-files and recorded in question_set_files.
 */
export async function syncQuestionSetsFromFs(
  _supabase: SupabaseClient
): Promise<SyncQuestionSetsResult> {
  const result: SyncQuestionSetsResult = { imported: 0, updated: 0, errors: [] };
  const setsRoot = getQuestionSetsRoot();

  let entries: { name: string; isDirectory: () => boolean }[];
  try {
    entries = await fs.readdir(setsRoot, { withFileTypes: true });
  } catch (e) {
    result.errors.push(
      `Cannot read question-sets root: ${e instanceof Error ? e.message : String(e)}`
    );
    return result;
  }

  const admin = createAdminClient();

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const slug = ent.name;
    const setPath = path.join(setsRoot, slug, "set.yaml");
    let content: string;
    try {
      content = await fs.readFile(setPath, "utf-8");
    } catch {
      continue;
    }
    const parsed = parseSetYamlFromContent(content, slug);
    if (!parsed) {
      result.errors.push(`Invalid set.yaml: ${slug}`);
      continue;
    }

    const { data: existing } = await admin
      .from("question_sets")
      .select("id")
      .eq("source_slug", slug)
      .maybeSingle();

    let setId: string;
    if (existing && (existing as { id: string }).id) {
      setId = (existing as { id: string }).id;
      const { error: updErr } = await admin
        .from("question_sets")
        .update({
          title: parsed.title,
          description: parsed.description ?? null,
          instructions: parsed.instructions ?? null,
          sandbox_zip_ref: parsed.sandboxZipRef ?? null,
        })
        .eq("id", setId);
      if (updErr) {
        result.errors.push(`Update ${slug}: ${updErr.message}`);
        continue;
      }
      await admin.from("question_set_items").delete().eq("question_set_id", setId);
      result.updated++;
    } else {
      const { data: inserted, error: insErr } = await admin
        .from("question_sets")
        .insert({
          title: parsed.title,
          description: parsed.description ?? null,
          instructions: parsed.instructions ?? null,
          sandbox_zip_ref: parsed.sandboxZipRef ?? null,
          source_slug: slug,
          owner_id: null,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        result.errors.push(`Insert ${slug}: ${insErr?.message ?? "failed"}`);
        continue;
      }
      setId = (inserted as { id: string }).id;
      result.imported++;
    }

    if (parsed.questionLogicalIds.length > 0) {
      const rows = parsed.questionLogicalIds.map((logicalId: string, i: number) => ({
        question_set_id: setId,
        question_logical_id: logicalId,
        position: i + 1,
      }));
      const { error: itemsErr } = await admin.from("question_set_items").insert(rows);
      if (itemsErr) {
        result.errors.push(`Items ${slug}: ${itemsErr.message}`);
      }
    }

    // Sync attached files from set folder files/ into question_set_files + file-storage
    if (parsed.files && parsed.files.length > 0) {
      await admin.from("question_set_files").delete().eq("question_set_id", setId);
      const folderPath = path.join(setsRoot, slug, "files");
      for (const f of parsed.files) {
        const filePath = path.join(folderPath, f.filename);
        let buffer: Buffer;
        try {
          buffer = await fs.readFile(filePath);
        } catch {
          result.errors.push(`Missing file ${slug}/files/${f.filename}`);
          continue;
        }
        const fileId = fileStorage.generateFileId();
        const storedPath = await fileStorage.saveFile(setId, fileId, f.filename, buffer);
        await admin.from("question_set_files").insert({
          id: fileId,
          question_set_id: setId,
          filename: f.filename,
          description: f.description ?? null,
          stored_path: storedPath,
        });
      }
    }
  }

  return result;
}
