/**
 * Supabase Storage-backed question store for Vercel (no writable filesystem).
 * Versioned layout: questions/{logical_id}/{version}/ (meta.yaml, prompt.md, ...).
 * Bucket name from env QUESTIONS_BUCKET (default: questions).
 */

import yaml from "js-yaml";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionStore } from "./store";
import type { ParsedQuestion, QuestionMetaListItem } from "./types";
import { parseQuestion } from "./parse";

const BUCKET = process.env.QUESTIONS_BUCKET ?? "questions";

function objectPrefix(logicalId: string, version: string): string {
  return `${logicalId}/${version}`;
}

export function createSupabaseQuestionStore(
  supabase: SupabaseClient
): QuestionStore {
  return {
    async list(): Promise<QuestionMetaListItem[]> {
      const { data: logicalList, error } = await supabase.storage
        .from(BUCKET)
        .list("", { limit: 1000 });
      if (error || !logicalList) return [];
      const results: QuestionMetaListItem[] = [];
      for (const lo of logicalList) {
        if (!lo.name || lo.id == null) continue;
        const logicalId = lo.name;
        if (logicalId.includes(".")) continue; // skip files at root
        const { data: versionList } = await supabase.storage
          .from(BUCKET)
          .list(logicalId, { limit: 500 });
        if (!versionList) continue;
        for (const vEnt of versionList) {
          if (!vEnt.name || vEnt.id == null) continue;
          const version = vEnt.name;
          const { data: metaData } = await supabase.storage
            .from(BUCKET)
            .download(`${logicalId}/${version}/meta.yaml`);
          if (!metaData) continue;
          try {
            const text = await metaData.text();
            const meta = yaml.load(text) as QuestionMetaListItem;
            if (meta?.id) results.push({ ...meta, id: logicalId, version });
          } catch {
            // skip
          }
        }
      }
      return results;
    },

    async get(logicalId: string, version: string): Promise<ParsedQuestion | null> {
      const { data: fileList } = await supabase.storage
        .from(BUCKET)
        .list(`${logicalId}/${version}`, { limit: 50 });
      if (!fileList || fileList.length === 0) return null;
      const files: { name: string; content: string }[] = [];
      for (const entry of fileList) {
        if (!entry.name || entry.id == null) continue;
        const { data: fileData } = await supabase.storage
          .from(BUCKET)
          .download(`${logicalId}/${version}/${entry.name}`);
        if (!fileData) continue;
        const content = await fileData.text();
        files.push({ name: entry.name, content });
      }
      const { question, error } = parseQuestion(logicalId, files);
      if (error) return null;
      return question;
    },

    async write(
      logicalId: string,
      version: string,
      files: { name: string; content: string }[]
    ): Promise<string | null> {
      const prefix = objectPrefix(logicalId, version);
      for (const f of files) {
        const objectPath = `${prefix}/${f.name}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(objectPath, new Blob([f.content], { type: "text/plain" }), {
            upsert: true,
            contentType: "text/plain",
          });
        if (error) return error.message;
      }
      return null;
    },

    async has(logicalId: string, version: string): Promise<boolean> {
      const { data } = await supabase.storage
        .from(BUCKET)
        .list(logicalId, { limit: 500 });
      if (!data) return false;
      return data.some((e) => e.name === version);
    },
  };
}
