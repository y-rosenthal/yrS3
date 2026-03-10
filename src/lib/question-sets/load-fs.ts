/**
 * Load question sets from filesystem (QUESTION-SET-FORMAT-0.0.2).
 * Layout: {root}/{set_id}/set.yaml with id, title, description?, question_logical_ids.
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import type { QuestionSet, QuestionSetListItem } from "./types";

function getQuestionSetsRoot(): string {
  const root = process.env.QUESTION_SETS_ROOT;
  if (root) return path.resolve(process.cwd(), root);
  return path.resolve(process.cwd(), "question-sets");
}

export interface SetYaml {
  id?: string;
  title?: string;
  description?: string;
  question_logical_ids?: unknown;
  sandbox_zip_ref?: string;
}

function parseSetYaml(content: string, folderName: string): QuestionSet | null {
  const raw = yaml.load(content) as SetYaml | undefined;
  if (!raw || typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (raw.id.trim() !== folderName) return null; // path and id must match
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  const ids = Array.isArray(raw.question_logical_ids)
    ? (raw.question_logical_ids as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0
      )
    : [];
  return {
    id: raw.id.trim(),
    title: raw.title.trim(),
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : null,
    questionLogicalIds: ids,
    sandboxZipRef:
      typeof raw.sandbox_zip_ref === "string" && raw.sandbox_zip_ref.trim()
        ? raw.sandbox_zip_ref.trim()
        : null,
    source: "file",
  };
}

/** Returns the filesystem path to a question set folder (for resolving sandbox zip etc.). */
export function getQuestionSetFolderPath(id: string): string {
  return path.join(getQuestionSetsRoot(), id);
}

export async function listQuestionSetsFromFs(): Promise<QuestionSetListItem[]> {
  const root = getQuestionSetsRoot();
  const results: QuestionSetListItem[] = [];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const setPath = path.join(root, ent.name, "set.yaml");
      try {
        const content = await fs.readFile(setPath, "utf-8");
        const set = parseSetYaml(content, ent.name);
        if (set) {
          results.push({
            id: set.id,
            title: set.title,
            description: set.description,
            questionCount: set.questionLogicalIds.length,
            source: "file",
          });
        }
      } catch {
        // skip missing or invalid set.yaml
      }
    }
  } catch {
    // root missing or not readable
  }
  return results;
}

export async function getQuestionSetFromFs(id: string): Promise<QuestionSet | null> {
  const root = getQuestionSetsRoot();
  const setPath = path.join(root, id, "set.yaml");
  try {
    const content = await fs.readFile(setPath, "utf-8");
    return parseSetYaml(content, id);
  } catch {
    return null;
  }
}
