/**
 * Question store abstraction: list questions and get question content.
 * Versioned layout: one folder per (logical_id, version). Implementations: FS and Supabase Storage.
 */

import type { ParsedQuestion, QuestionMetaListItem } from "./types";

export interface QuestionStore {
  list(): Promise<QuestionMetaListItem[]>;
  /** Get question content by logical_id and version. */
  get(logicalId: string, version: string): Promise<ParsedQuestion | null>;
  /** Write question files for a new version. Never overwrites other versions. Returns error message or null. */
  write(
    logicalId: string,
    version: string,
    files: { name: string; content: string }[]
  ): Promise<string | null>;
  /** Check if (logicalId, version) exists. */
  has(logicalId: string, version: string): Promise<boolean>;
}
