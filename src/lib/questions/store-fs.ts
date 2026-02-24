/**
 * Filesystem-backed question store for local development (e.g. Ubuntu).
 * Questions root is configured via QUESTIONS_ROOT (default: ./questions).
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import type { QuestionStore } from "./store";
import type { ParsedQuestion, QuestionMetaListItem } from "./types";
import { parseQuestion } from "./parse";

function getQuestionsRoot(): string {
  const root = process.env.QUESTIONS_ROOT;
  if (root) return path.resolve(process.cwd(), root);
  return path.resolve(process.cwd(), "questions");
}

export function getQuestionsRootPath(): string {
  return getQuestionsRoot();
}

export function createFsQuestionStore(): QuestionStore {
  const root = getQuestionsRoot();

  return {
    async list(): Promise<QuestionMetaListItem[]> {
      try {
        const entries = await fs.readdir(root, { withFileTypes: true });
        const results: QuestionMetaListItem[] = [];
        for (const ent of entries) {
          if (!ent.isDirectory()) continue;
          const metaPath = path.join(root, ent.name, "meta.yaml");
          try {
            const content = await fs.readFile(metaPath, "utf-8");
            const meta = yaml.load(content) as QuestionMetaListItem;
            if (meta?.id) results.push(meta);
          } catch {
            // skip invalid folders
          }
        }
        return results;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw e;
      }
    },

    async get(id: string): Promise<ParsedQuestion | null> {
      const dir = path.join(root, id);
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: { name: string; content: string }[] = [];
        for (const ent of entries) {
          if (!ent.isFile()) continue;
          const fullPath = path.join(dir, ent.name);
          const content = await fs.readFile(fullPath, "utf-8");
          files.push({ name: ent.name, content });
        }
        const { question, error } = parseQuestion(id, files);
        if (error) return null;
        return question;
      } catch {
        return null;
      }
    },

    async write(
      questionId: string,
      files: { name: string; content: string }[],
      options?: { isModification?: boolean }
    ): Promise<string | null> {
      const dir = path.join(root, questionId);
      try {
        if (!options?.isModification) {
          await fs.mkdir(dir, { recursive: true });
        } else {
          const stat = await fs.stat(dir);
          if (!stat.isDirectory()) return "Question folder does not exist";
        }
        for (const f of files) {
          const filePath = path.join(dir, f.name);
          await fs.writeFile(filePath, f.content, "utf-8");
        }
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },

    async has(id: string): Promise<boolean> {
      const dir = path.join(root, id);
      try {
        const stat = await fs.stat(dir);
        return stat.isDirectory();
      } catch {
        return false;
      }
    },
  };
}
