/**
 * Question set types (SPEC-QUESTION-SETS-0.0.2).
 * A question set is a named, ordered list of question logical ids — used as test, homework, or study list.
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
  /** Attached files (DB sets only; file-based sets use YAML + files in folder). */
  files?: QuestionSetFile[];
  /** When listing: whether this set came from DB or filesystem. */
  source?: "db" | "file";
}

export interface QuestionSetListItem {
  id: string;
  title: string;
  description?: string | null;
  questionCount: number;
  source?: "db" | "file";
}
