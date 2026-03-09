/**
 * Filesystem-backed question store for local development (e.g. Ubuntu).
 * Versioned layout: questions/{logical_id}/{version}/ (meta.yaml, prompt.md, options.yaml, ...).
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import type { QuestionStore } from "./store";
import type { ParsedQuestion, QuestionMetaListItem, VersionKey } from "./types";
import { parseQuestion } from "./parse";

function getQuestionsRoot(): string {
  const root = process.env.QUESTIONS_ROOT;
  if (root) return path.resolve(process.cwd(), root);
  return path.resolve(process.cwd(), "questions");
}

export function getQuestionsRootPath(): string {
  return getQuestionsRoot();
}

/** Resolve FS backup root when using Supabase storage (optional mirror). */
export function getQuestionsFsBackupRoot(): string | null {
  const backup = process.env.QUESTIONS_FS_BACKUP_ROOT;
  if (backup) return path.resolve(process.cwd(), backup);
  return null;
}

/**
 * List all (logicalId, version) from the filesystem under root, excluding _conflicts.
 * Used by sync to compare with DB.
 */
export async function listVersionKeysFromFs(rootPath: string): Promise<VersionKey[]> {
  const results: VersionKey[] = [];
  try {
    const logicalDirs = await fs.readdir(rootPath, { withFileTypes: true });
    for (const ent of logicalDirs) {
      if (!ent.isDirectory()) continue;
      const logicalId = ent.name;
      if (logicalId === "_conflicts") continue;
      const logicalPath = path.join(rootPath, logicalId);
      const versionDirs = await fs.readdir(logicalPath, { withFileTypes: true }).catch(() => []);
      for (const vEnt of versionDirs) {
        if (!vEnt.isDirectory()) continue;
        const version = vEnt.name;
        const metaPath = path.join(logicalPath, version, "meta.yaml");
        try {
          await fs.access(metaPath);
          results.push({ logicalId, version });
        } catch {
          // skip if no meta.yaml
        }
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  return results;
}

/**
 * Read all files from a version directory at a given root. Returns null if dir missing or unreadable.
 * Used by sync to load FS-only versions for import.
 */
export async function readVersionFilesFromFs(
  rootPath: string,
  logicalId: string,
  version: string
): Promise<{ name: string; content: string }[] | null> {
  const dir = path.join(rootPath, logicalId, version);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: { name: string; content: string }[] = [];
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const fullPath = path.join(dir, ent.name);
      const content = await fs.readFile(fullPath, "utf-8");
      files.push({ name: ent.name, content });
    }
    return files;
  } catch {
    return null;
  }
}

function versionDir(root: string, logicalId: string, version: string): string {
  return path.join(root, logicalId, version);
}

export function createFsQuestionStore(): QuestionStore {
  const root = getQuestionsRoot();

  return {
    async list(): Promise<QuestionMetaListItem[]> {
      try {
        const results: QuestionMetaListItem[] = [];
        const logicalDirs = await fs.readdir(root, { withFileTypes: true });
        for (const ent of logicalDirs) {
          if (!ent.isDirectory()) continue;
          const logicalId = ent.name;
          if (logicalId === "_conflicts") continue;
          const logicalPath = path.join(root, logicalId);
          const versionDirs = await fs.readdir(logicalPath, { withFileTypes: true }).catch(() => []);
          for (const vEnt of versionDirs) {
            if (!vEnt.isDirectory()) continue;
            const version = vEnt.name;
            const metaPath = path.join(logicalPath, version, "meta.yaml");
            try {
              const content = await fs.readFile(metaPath, "utf-8");
              const meta = yaml.load(content) as QuestionMetaListItem;
              if (meta?.id) results.push({ ...meta, id: logicalId, version });
            } catch {
              // skip invalid
            }
          }
        }
        return results;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw e;
      }
    },

    async get(logicalId: string, version: string): Promise<ParsedQuestion | null> {
      const dir = versionDir(root, logicalId, version);
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: { name: string; content: string }[] = [];
        for (const ent of entries) {
          if (!ent.isFile()) continue;
          const fullPath = path.join(dir, ent.name);
          const content = await fs.readFile(fullPath, "utf-8");
          files.push({ name: ent.name, content });
        }
        const { question, error } = parseQuestion(logicalId, files);
        if (error) return null;
        return question;
      } catch {
        return null;
      }
    },

    async write(
      logicalId: string,
      version: string,
      files: { name: string; content: string }[]
    ): Promise<string | null> {
      const dir = versionDir(root, logicalId, version);
      try {
        await fs.mkdir(dir, { recursive: true });
        for (const f of files) {
          const filePath = path.join(dir, f.name);
          await fs.writeFile(filePath, f.content, "utf-8");
        }
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },

    async has(logicalId: string, version: string): Promise<boolean> {
      const dir = versionDir(root, logicalId, version);
      try {
        const stat = await fs.stat(dir);
        return stat.isDirectory();
      } catch {
        return false;
      }
    },
  };
}
