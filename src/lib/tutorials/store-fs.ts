/**
 * Tutorials filesystem storage (SPEC-0.0.8). One folder per tutorial: tutorials/{id}/meta.yaml.
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import type { TutorialRow } from "./types";

export function getTutorialsRoot(): string {
  const root = process.env.TUTORIALS_ROOT;
  if (root) return path.resolve(process.cwd(), root);
  return path.resolve(process.cwd(), "tutorials");
}

export interface TutorialMetaYaml {
  id: string;
  title?: string | null;
  external_ref?: string | null;
  content_mode: string;
  stored_content_path?: string | null;
  fact_ids?: string[];
  tag_paths?: string[];
  created_at?: string;
  updated_at?: string;
}

const META_FILENAME = "meta.yaml";

function tutorialDir(root: string, id: string): string {
  return path.join(root, id);
}

function metaPath(root: string, id: string): string {
  return path.join(tutorialDir(root, id), META_FILENAME);
}

export async function readTutorialFromFs(id: string): Promise<TutorialRow | null> {
  const root = getTutorialsRoot();
  const filePath = metaPath(root, id);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = yaml.load(content) as TutorialMetaYaml | undefined;
    if (!parsed || !parsed.content_mode) return null;
    const now = new Date().toISOString();
    return {
      id: parsed.id ?? id,
      title: parsed.title ?? null,
      external_ref: parsed.external_ref ?? null,
      content_mode: parsed.content_mode as TutorialRow["content_mode"],
      stored_content_path: parsed.stored_content_path ?? null,
      created_at: parsed.created_at ?? now,
      updated_at: parsed.updated_at ?? now,
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function writeTutorialMetaToFs(
  tutorial: TutorialRow,
  factIds: string[] = [],
  tagPaths: string[] = []
): Promise<void> {
  const root = getTutorialsRoot();
  const dir = tutorialDir(root, tutorial.id);
  await fs.mkdir(dir, { recursive: true });
  const doc: TutorialMetaYaml = {
    id: tutorial.id,
    title: tutorial.title,
    external_ref: tutorial.external_ref,
    content_mode: tutorial.content_mode,
    stored_content_path: tutorial.stored_content_path,
    fact_ids: factIds.length ? factIds : undefined,
    tag_paths: tagPaths.length ? tagPaths : undefined,
    created_at: tutorial.created_at,
    updated_at: tutorial.updated_at,
  };
  await fs.writeFile(path.join(dir, META_FILENAME), yaml.dump(doc, { lineWidth: -1 }), "utf-8");
}

export async function listTutorialIdsFromFs(): Promise<string[]> {
  const root = getTutorialsRoot();
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const ids: string[] = [];
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const metaPath = path.join(root, ent.name, META_FILENAME);
      try {
        await fs.access(metaPath);
        ids.push(ent.name);
      } catch {
        // skip if no meta
      }
    }
    return ids;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
