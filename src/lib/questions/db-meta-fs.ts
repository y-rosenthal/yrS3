/**
 * Read/write app-only metadata (ownership, status) in a separate file per version.
 * Keeps question content (meta.yaml, prompt, options) portable; db_meta.yaml is optional app baggage.
 */

import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";

export type DbMetaStatus = "approved" | "pending";

export interface DbMetaYaml {
  owner_id: string;
  status: DbMetaStatus;
  proposed_by: string | null;
}

const DB_META_FILENAME = "db_meta.yaml";

/**
 * Resolve the version directory path under the given root.
 */
export function getVersionDirPath(root: string, logicalId: string, version: string): string {
  return path.join(root, logicalId, version);
}

/**
 * Write db_meta.yaml into an existing version directory.
 * Creates the directory if it does not exist.
 */
export async function writeDbMeta(
  root: string,
  logicalId: string,
  version: string,
  meta: DbMetaYaml
): Promise<void> {
  const dir = getVersionDirPath(root, logicalId, version);
  await fs.mkdir(dir, { recursive: true });
  const content = yaml.dump(
    {
      owner_id: meta.owner_id,
      status: meta.status,
      proposed_by: meta.proposed_by,
    },
    { lineWidth: -1 }
  );
  await fs.writeFile(path.join(dir, DB_META_FILENAME), content, "utf-8");
}

/**
 * Read db_meta.yaml from a version directory. Returns null if file missing or invalid.
 */
export async function readDbMeta(
  root: string,
  logicalId: string,
  version: string
): Promise<DbMetaYaml | null> {
  const filePath = path.join(getVersionDirPath(root, logicalId, version), DB_META_FILENAME);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const loaded = yaml.load(content) as Record<string, unknown>;
    if (
      loaded &&
      typeof loaded.owner_id === "string" &&
      (loaded.status === "approved" || loaded.status === "pending")
    ) {
      return {
        owner_id: loaded.owner_id,
        status: loaded.status as DbMetaStatus,
        proposed_by: typeof loaded.proposed_by === "string" ? loaded.proposed_by : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}
