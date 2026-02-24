/**
 * Question types and metadata per QUESTION-FORMAT-0.0.1.md and SPEC-0.0.1.md.
 */

export const QUESTION_TYPES = [
  "multiple_choice",
  "short_answer",
  "long_answer",
  "r",
  "bash",
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
  created_at?: string;
  modified_at?: string;
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
  /** Raw file names present (for storage) */
  _files?: string[];
}

export interface QuestionMetaListItem {
  id: string;
  type: string;
  version: string;
  title?: string;
  domain?: string;
  created_at?: string;
  modified_at?: string;
}
