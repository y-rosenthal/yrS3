/**
 * Question store abstraction: list questions and get question content.
 * Implementations: filesystem (local) and Supabase Storage (Vercel).
 */

import type { ParsedQuestion, QuestionMetaListItem } from "./types";

export interface QuestionStore {
  list(): Promise<QuestionMetaListItem[]>;
  get(id: string): Promise<ParsedQuestion | null>;
  /** Write question files (for upload). Returns error message or null. */
  write(
    questionId: string,
    files: { name: string; content: string }[],
    options?: { isModification?: boolean }
  ): Promise<string | null>;
  /** Check if a question id exists. */
  has(id: string): Promise<boolean>;
}
