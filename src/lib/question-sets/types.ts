/**
 * Question set types (SPEC-QUESTION-SETS-0.0.2).
 * A question set is a named, ordered list of question logical ids — used as test, homework, or study list.
 * DB is the source of truth; filesystem is imported via sync only (same model as questions).
 */

export interface QuestionSetFile {
  id: string;
  filename: string;
  description?: string | null;
  /** Server path or key used for download (opaque to client). */
  storedPath: string;
}

export interface QuestionSet {
  id: string;
  title: string;
  description?: string | null;
  /** Instructions shown when taking the set. */
  instructions?: string | null;
  questionLogicalIds: string[];
  /** Optional zip filename (or path) for shared sandbox folder tree for bash questions in this set. */
  sandboxZipRef?: string | null;
  /** Attached files (stored in DB + file-storage after sync or upload). */
  files?: QuestionSetFile[];
  /** When set, this set was synced from question-sets/{sourceSlug}/ (folder name). */
  sourceSlug?: string | null;
}

export interface QuestionSetListItem {
  id: string;
  title: string;
  description?: string | null;
  questionCount: number;
  /** Folder name under question-sets/ when synced from FS; null when created in UI only. */
  sourceSlug?: string | null;
}
