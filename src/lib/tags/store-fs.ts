/**
 * Tags taxonomy filesystem storage (SPEC-0.0.8). Single file taxonomy.yaml with array of tags.
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import type { TagRow, InsertTag } from "./types";

export function getTagsRoot(): string {
  const root = process.env.TAGS_ROOT;
  if (root) return path.resolve(process.cwd(), root);
  return path.resolve(process.cwd(), "tags");
}

const TAXONOMY_FILENAME = "taxonomy.yaml";

export interface TaxonomyYamlEntry {
  id?: string;
  name: string;
  parent_id?: string | null;
  path: string;
}

export interface TaxonomyYaml {
  tags?: TaxonomyYamlEntry[];
  updated_at?: string;
}

export async function readTaxonomyFromFs(): Promise<TagRow[]> {
  const root = getTagsRoot();
  const filePath = path.join(root, TAXONOMY_FILENAME);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = yaml.load(content) as TaxonomyYaml | undefined;
    const entries = parsed?.tags ?? [];
    const now = new Date().toISOString();
    return entries
      .filter((e) => e && typeof e.path === "string" && e.path.trim())
      .map((e) => ({
        id: typeof e.id === "string" && e.id.trim() ? e.id : crypto.randomUUID(),
        name: typeof e.name === "string" ? e.name : String(e.path).split("/").pop() ?? "",
        parent_id: e.parent_id ?? null,
        path: (e.path as string).trim(),
        created_at: now,
        updated_at: now,
      }));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

export async function writeTaxonomyToFs(tags: TagRow[]): Promise<void> {
  const root = getTagsRoot();
  await fs.mkdir(root, { recursive: true });
  const filePath = path.join(root, TAXONOMY_FILENAME);
  const entries: TaxonomyYamlEntry[] = tags.map((t) => ({
    id: t.id,
    name: t.name,
    parent_id: t.parent_id || undefined,
    path: t.path,
  }));
  const doc: TaxonomyYaml = {
    tags: entries,
    updated_at: new Date().toISOString(),
  };
  await fs.writeFile(filePath, yaml.dump(doc, { lineWidth: -1 }), "utf-8");
}
