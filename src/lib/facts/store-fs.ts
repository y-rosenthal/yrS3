/**
 * Canonical facts filesystem storage (SPEC-0.0.8). One YAML file per fact under facts/{id}.yaml.
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import type { FactRow } from "./types";

export function getFactsRoot(): string {
  const root = process.env.FACTS_ROOT;
  if (root) return path.resolve(process.cwd(), root);
  return path.resolve(process.cwd(), "facts");
}

export interface FactYaml {
  id: string;
  canonical_text: string;
  tag_path?: string | null;
  subject?: string | null;
  predicate?: string | null;
  object?: string | null;
  created_at?: string;
  updated_at?: string;
}

function factFilePath(root: string, id: string): string {
  return path.join(root, `${id}.yaml`);
}

export async function readFactFromFs(id: string): Promise<FactRow | null> {
  const root = getFactsRoot();
  const filePath = factFilePath(root, id);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = yaml.load(content) as FactYaml | undefined;
    if (!parsed || typeof parsed.canonical_text !== "string") return null;
    const now = new Date().toISOString();
    return {
      id: parsed.id ?? id,
      canonical_text: parsed.canonical_text,
      tag_path: parsed.tag_path ?? null,
      subject: parsed.subject ?? null,
      predicate: parsed.predicate ?? null,
      object: parsed.object ?? null,
      created_at: parsed.created_at ?? now,
      updated_at: parsed.updated_at ?? now,
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function writeFactToFs(fact: FactRow): Promise<void> {
  const root = getFactsRoot();
  await fs.mkdir(root, { recursive: true });
  const filePath = factFilePath(root, fact.id);
  const doc: FactYaml = {
    id: fact.id,
    canonical_text: fact.canonical_text,
    tag_path: fact.tag_path,
    subject: fact.subject,
    predicate: fact.predicate,
    object: fact.object,
    created_at: fact.created_at,
    updated_at: fact.updated_at,
  };
  await fs.writeFile(filePath, yaml.dump(doc, { lineWidth: -1 }), "utf-8");
}

export async function listFactIdsFromFs(): Promise<string[]> {
  const root = getFactsRoot();
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const ids: string[] = [];
    for (const ent of entries) {
      if (!ent.isFile() || !ent.name.endsWith(".yaml")) continue;
      const base = ent.name.slice(0, -5);
      if (base) ids.push(base);
    }
    return ids;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
