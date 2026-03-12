/**
 * Load question sets from filesystem (QUESTION-SET-FORMAT-0.0.2).
 * Layout: {root}/{set_id}/set.yaml with id, title, description?, question_logical_ids.
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import type { QuestionSet, QuestionSetFile } from "./types";

export function getQuestionSetsRoot(): string {
  const root = process.env.QUESTION_SETS_ROOT;
  if (root) return path.resolve(process.cwd(), root);
  return path.resolve(process.cwd(), "question-sets");
}

export interface SetYamlAttachedFile {
  filename?: string;
  description?: string;
}

export interface SetYaml {
  id?: string;
  title?: string;
  description?: string;
  instructions?: string;
  question_logical_ids?: unknown;
  sandbox_zip_ref?: string;
  attached_files?: unknown;
}

export function parseSetYamlFromContent(content: string, folderName: string): QuestionSet | null {
  const raw = yaml.load(content) as SetYaml | undefined;
  if (!raw || typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (raw.id.trim() !== folderName) return null; // path and id must match
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  const ids = Array.isArray(raw.question_logical_ids)
    ? (raw.question_logical_ids as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0
      )
    : [];
  const attachedFiles: QuestionSetFile[] = Array.isArray(raw.attached_files)
    ? (raw.attached_files as SetYamlAttachedFile[])
        .filter((f) => f && typeof f.filename === "string" && f.filename.trim())
        .map((f, i) => ({
          id: `file-${folderName}-${i}-${f.filename!.trim()}`,
          filename: f.filename!.trim(),
          description:
            typeof f.description === "string" && f.description.trim()
              ? f.description.trim()
              : null,
          storedPath: path.join(folderName, "files", f.filename!.trim()),
        }))
    : [];
  return {
    id: raw.id.trim(),
    title: raw.title.trim(),
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : null,
    instructions:
      typeof raw.instructions === "string" && raw.instructions.trim()
        ? raw.instructions.trim()
        : null,
    questionLogicalIds: ids,
    sandboxZipRef:
      typeof raw.sandbox_zip_ref === "string" && raw.sandbox_zip_ref.trim()
        ? raw.sandbox_zip_ref.trim()
        : null,
    files: attachedFiles.length > 0 ? attachedFiles : undefined,
  };
}

/** Returns the filesystem path to a question set folder (for resolving sandbox zip etc.). */
export function getQuestionSetFolderPath(id: string): string {
  return path.join(getQuestionSetsRoot(), id);
}

// Runtime list/get of question sets from FS removed — use syncQuestionSetsFromFs to import into DB.
