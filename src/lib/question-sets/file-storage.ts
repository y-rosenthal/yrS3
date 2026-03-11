/**
 * Store and retrieve attached files for DB-backed question sets.
 * Files are stored under data/question-set-files/{setId}/{fileId}_{filename}.
 */

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ROOT = "data/question-set-files";

function getRootDir(): string {
  return path.resolve(process.cwd(), ROOT);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
}

/** Returns relative path from ROOT: {setId}/{fileId}_{filename} */
export function getStoredPath(setId: string, fileId: string, originalFilename: string): string {
  const safe = sanitizeFilename(originalFilename);
  return path.join(setId, `${fileId}_${safe}`);
}

export async function saveFile(
  setId: string,
  fileId: string,
  originalFilename: string,
  buffer: Buffer
): Promise<string> {
  const relativePath = getStoredPath(setId, fileId, originalFilename);
  const absolutePath = path.join(getRootDir(), relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return relativePath;
}

export async function readFile(storedPath: string): Promise<Buffer | null> {
  const absolutePath = path.join(getRootDir(), storedPath);
  try {
    return await fs.readFile(absolutePath);
  } catch {
    return null;
  }
}

export async function deleteFile(storedPath: string): Promise<void> {
  const absolutePath = path.join(getRootDir(), storedPath);
  try {
    await fs.unlink(absolutePath);
  } catch {
    // ignore if already missing
  }
}

export function generateFileId(): string {
  return randomUUID();
}
