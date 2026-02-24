/**
 * Supabase Storage-backed question store for Vercel (no writable filesystem).
 * Bucket name from env QUESTIONS_BUCKET (default: questions).
 */

import yaml from "js-yaml";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionStore } from "./store";
import type { ParsedQuestion, QuestionMetaListItem } from "./types";
import { parseQuestion } from "./parse";

const BUCKET = process.env.QUESTIONS_BUCKET ?? "questions";

export function createSupabaseQuestionStore(
  supabase: SupabaseClient
): QuestionStore {
  return {
    async list(): Promise<QuestionMetaListItem[]> {
      const { data: list, error } = await supabase.storage
        .from(BUCKET)
        .list("", { limit: 1000 });
      if (error || !list) return [];
      const ids = list.filter((e) => e.id && e.name && !e.name.includes(".")).map((e) => e.name);
      const results: QuestionMetaListItem[] = [];
      for (const id of ids) {
        const { data: metaData } = await supabase.storage
          .from(BUCKET)
          .download(`${id}/meta.yaml`);
        if (!metaData) continue;
        try {
          const text = await metaData.text();
          const meta = yaml.load(text) as QuestionMetaListItem;
          if (meta?.id) results.push(meta);
        } catch {
          // skip
        }
      }
      return results;
    },

    async get(id: string): Promise<ParsedQuestion | null> {
      const { data: list } = await supabase.storage
        .from(BUCKET)
        .list(id, { limit: 50 });
      if (!list || list.length === 0) return null;
      const files: { name: string; content: string }[] = [];
      for (const entry of list) {
        if (!entry.name || entry.id == null) continue;
        const { data: fileData } = await supabase.storage
          .from(BUCKET)
          .download(`${id}/${entry.name}`);
        if (!fileData) continue;
        const content = await fileData.text();
        files.push({ name: entry.name, content });
      }
      const { question, error } = parseQuestion(id, files);
      if (error) return null;
      return question;
    },

    async write(
      questionId: string,
      files: { name: string; content: string }[],
      options?: { isModification?: boolean }
    ): Promise<string | null> {
      for (const f of files) {
        const path = `${questionId}/${f.name}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, new Blob([f.content], { type: "text/plain" }), {
            upsert: true,
            contentType: "text/plain",
          });
        if (error) return error.message;
      }
      return null;
    },

    async has(id: string): Promise<boolean> {
      const { data } = await supabase.storage.from(BUCKET).list(id, { limit: 1 });
      return Array.isArray(data) && data.length > 0;
    },
  };
}
