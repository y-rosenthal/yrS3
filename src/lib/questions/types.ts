/**
 * Question types and metadata per QUESTION-FORMAT-0.0.1.md and SPEC-0.0.1.md.
 */

export const QUESTION_TYPES = [
  "multiple_choice",
  "short_answer",
  "long_answer",
  "r",
  "bash",
  "bash_predict_output",
  "excel_formula",
  "html",
  "css",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface MetaYaml {
  id: string;
  type: string;
  version: string;
  title?: string;
  domain?: string;
  /** Tags for filtering and discovery (SPEC-0.0.6). */
  tags?: string[];
  created_at?: string;
  modified_at?: string;
  /** bash: optional reference to zip file for sandbox folder tree (filename or path). */
  sandbox_zip_ref?: string;
}

export interface MultipleChoiceOption {
  id: string;
  text: string;
  correct?: boolean;
}

export interface OptionsYaml {
  correct_id?: string;
  options?: MultipleChoiceOption[];
  /** Inline format: list of options with correct: true */
  [key: number]: MultipleChoiceOption | undefined;
}

export interface ExpectedYaml {
  answer?: string;
  answers?: string[];
}

export interface RubricYaml {
  criteria?: string[];
  points_per_criterion?: number;
}

export interface TestCaseYaml {
  description?: string;
  stdin?: string;
  setup?: string;
  inputs?: Record<string, unknown>;
  env?: Record<string, string>;
  cwd?: string;
}

export interface ParsedQuestion {
  id: string;
  type: QuestionType;
  version: string;
  title?: string;
  domain?: string;
  created_at?: string;
  modified_at?: string;
  prompt: string; // resolved prompt content (from prompt.md or prompt.txt)
  promptFormat: "md" | "txt";
  options?: MultipleChoiceOption[]; // multiple_choice
  correctId?: string; // multiple_choice
  expected?: ExpectedYaml; // short_answer / long_answer
  rubric?: RubricYaml;
  solutionScript?: string; // bash: solution.sh content, r: solution.R content
  tests?: TestCaseYaml[];
  /** bash: optional ref to zip for sandbox folder tree (simple filename only; no path separators or '..'). */
  sandboxZipRef?: string;
  /** bash_predict_output: script shown to student; grading uses run output. */
  scriptSource?: string;
  /** Tags for filtering and discovery (SPEC-0.0.6). */
  tags?: string[];
  /** Raw file names present (for storage) */
  _files?: string[];
}

export interface QuestionMetaListItem {
  id: string;
  type: string;
  version: string;
  title?: string;
  domain?: string;
  tags?: string[];
  created_at?: string;
  modified_at?: string;
}

/** Key for a specific immutable question version (logical_id + version). */
export interface VersionKey {
  logicalId: string;
  version: string;
}

/** Payload for creating or updating a multiple_choice question (UI/API). */
export interface MultipleChoicePayload {
  type: "multiple_choice";
  title?: string;
  domain?: string;
  tags?: string[];
  prompt: string;
  options: MultipleChoiceOption[];
}

/** Payload for creating or updating a bash (Type A: write code) question. */
export interface BashPayload {
  type: "bash";
  title?: string;
  domain?: string;
  tags?: string[];
  prompt: string;
  solutionScript: string;
  tests?: TestCaseYaml[];
  sandboxZipRef?: string;
}

/** Payload for creating or updating a bash_predict_output (Type B: predict output) question. */
export interface BashPredictOutputPayload {
  type: "bash_predict_output";
  title?: string;
  domain?: string;
  tags?: string[];
  prompt: string;
  scriptSource: string;
  expectedOutput: string;
}

/** Union of payloads per question type. */
export type QuestionPayload =
  | MultipleChoicePayload
  | BashPayload
  | BashPredictOutputPayload;
