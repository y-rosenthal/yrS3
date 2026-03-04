/**
 * Question set types (SPEC-QUESTION-SETS-0.0.2).
 * A question set is a named, ordered list of question logical ids — used as test, homework, or study list.
 */

export interface QuestionSet {
  id: string;
  title: string;
  description?: string | null;
  questionLogicalIds: string[];
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
