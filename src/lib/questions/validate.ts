/**
 * Validation per QUESTION-FORMAT-0.0.1.md Section 6.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 */

import yaml from "js-yaml";
import type {
  MetaYaml,
  OptionsYaml,
  QuestionType,
  MultipleChoiceOption,
} from "./types";
import { QUESTION_TYPES } from "./types";
import { isValidVersion } from "./version";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateMetaYaml(
  meta: unknown,
  folderName: string
): { meta?: MetaYaml; errors: string[] } {
  const errors: string[] = [];
  if (meta == null || typeof meta !== "object") {
    return { errors: ["meta.yaml is missing or not an object"] };
  }
  const m = meta as Record<string, unknown>;
  const id = m.id;
  const type = m.type;
  const version = m.version;

  if (!validNonEmptyString(id)) {
    errors.push("meta.yaml: 'id' is required and must be a non-empty string");
  } else if (id !== folderName) {
    errors.push(
      `meta.yaml: 'id' (${id}) must match folder name (${folderName})`
    );
  }
  if (!validNonEmptyString(type)) {
    errors.push("meta.yaml: 'type' is required and must be a non-empty string");
  } else if (!QUESTION_TYPES.includes(type as QuestionType)) {
    errors.push(
      `meta.yaml: 'type' must be one of: ${QUESTION_TYPES.join(", ")}`
    );
  }
  if (!validNonEmptyString(version)) {
    errors.push(
      "meta.yaml: 'version' is required and must be a non-empty string"
    );
  } else if (!isValidVersion(version)) {
    errors.push(
      "meta.yaml: 'version' must be four-part (Q_MAJ.Q_MIN.A_MAJ.A_MIN, e.g. 1.0.0.0)"
    );
  }

  if (errors.length > 0) return { errors };
  return {
    meta: {
      id: String(id),
      type: String(type),
      version: String(version),
      title: typeof m.title === "string" ? m.title : undefined,
      domain: typeof m.domain === "string" ? m.domain : undefined,
      created_at: typeof m.created_at === "string" ? m.created_at : undefined,
      modified_at:
        typeof m.modified_at === "string" ? m.modified_at : undefined,
    },
    errors: [],
  };
}

export function validateOptionsYaml(
  options: unknown,
  type: string
): ValidationResult {
  if (type !== "multiple_choice") return { valid: true, errors: [] };
  const errors: string[] = [];
  if (options == null) {
    return { valid: false, errors: ["options.yaml is required for multiple_choice"] };
  }
  let list: MultipleChoiceOption[] = [];
  const o = options as OptionsYaml;
  if (Array.isArray(o)) {
    list = o as MultipleChoiceOption[];
  } else if (o.options && Array.isArray(o.options)) {
    list = o.options;
  } else {
    return { valid: false, errors: ["options.yaml must be a list or have an 'options' list"] };
  }
  if (list.length === 0) {
    return { valid: false, errors: ["options.yaml must not be empty"] };
  }
  const ids = new Set<string>();
  let correctCount = 0;
  for (const opt of list) {
    if (!opt || typeof opt !== "object") {
      errors.push("Each option must be an object with id and text");
      continue;
    }
    if (!validNonEmptyString(opt.id)) {
      errors.push("Each option must have a non-empty 'id'");
    }
    if (ids.has(opt.id)) {
      errors.push(`Duplicate option id: ${opt.id}`);
    }
    ids.add(opt.id);
    if (opt.correct === true) correctCount++;
  }
  if (correctCount === 0) {
    errors.push("Exactly one option must have correct: true");
  }
  if (correctCount > 1) {
    errors.push("Only one option may have correct: true");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Validate type-specific required files (Section 6.3). */
export function validateTypeSpecificFiles(
  type: string,
  files: { name: string; content?: string }[]
): ValidationResult {
  const fileNames = new Set(files.map((f) => f.name));
  const errors: string[] = [];
  switch (type) {
    case "multiple_choice":
      if (!fileNames.has("options.yaml")) {
        errors.push("multiple_choice requires options.yaml");
      }
      break;
    case "r":
      if (!fileNames.has("solution.R")) {
        errors.push("type 'r' requires solution.R");
      }
      break;
    case "bash":
      if (!fileNames.has("solution.sh")) {
        errors.push("type 'bash' requires solution.sh");
      }
      break;
    case "bash_predict_output":
      if (!fileNames.has("script.sh")) {
        errors.push("type 'bash_predict_output' requires script.sh");
      }
      if (!fileNames.has("expected.yaml")) {
        errors.push("type 'bash_predict_output' requires expected.yaml");
      }
      break;
    default:
      break;
  }
  return { valid: errors.length === 0, errors };
}

/** Prompt: exactly one of prompt.md or prompt.txt (Section 6.1). */
export function validatePromptPresence(files: { name: string }[]): ValidationResult {
  const hasMd = files.some((f) => f.name === "prompt.md");
  const hasTxt = files.some((f) => f.name === "prompt.txt");
  if (!hasMd && !hasTxt) {
    return { valid: false, errors: ["Exactly one of prompt.md or prompt.txt is required"] };
  }
  return { valid: true, errors: [] };
}

/** Validate multiple_choice payload (API create/new version). */
export function validateMultipleChoicePayload(payload: {
  type?: unknown;
  prompt?: unknown;
  options?: unknown;
}): ValidationResult {
  const errors: string[] = [];
  if (payload.type !== "multiple_choice") {
    errors.push("type must be 'multiple_choice'");
  }
  if (typeof payload.prompt !== "string" || !payload.prompt.trim()) {
    errors.push("prompt is required and must be a non-empty string");
  }
  if (!Array.isArray(payload.options) || payload.options.length === 0) {
    errors.push("options is required and must be a non-empty array");
  } else {
    const optResult = validateOptionsYaml(payload.options, "multiple_choice");
    if (!optResult.valid) errors.push(...optResult.errors);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * sandboxZipRef must be a simple filename only (no path separators or traversal).
 * Prevents path traversal when resolving zip path under the question version folder.
 */
export function isSafeSandboxZipRef(ref: string): boolean {
  if (typeof ref !== "string" || !ref.trim()) return false;
  const trimmed = ref.trim();
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    return false;
  }
  return true;
}

/** Validate bash (Type A) payload (API create/new version). */
export function validateBashPayload(payload: {
  type?: unknown;
  prompt?: unknown;
  solutionScript?: unknown;
  tests?: unknown;
  sandboxZipRef?: unknown;
}): ValidationResult {
  const errors: string[] = [];
  if (payload.type !== "bash") {
    errors.push("type must be 'bash'");
  }
  if (typeof payload.prompt !== "string" || !payload.prompt.trim()) {
    errors.push("prompt is required and must be a non-empty string");
  }
  if (typeof payload.solutionScript !== "string" || !payload.solutionScript.trim()) {
    errors.push("solutionScript is required and must be a non-empty string");
  }
  if (payload.tests != null && !Array.isArray(payload.tests)) {
    errors.push("tests must be an array when provided");
  }
  if (payload.sandboxZipRef != null && payload.sandboxZipRef !== "") {
    if (typeof payload.sandboxZipRef !== "string" || !isSafeSandboxZipRef(payload.sandboxZipRef)) {
      errors.push("sandboxZipRef must be a simple filename (no path separators or '..')");
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Validate bash_predict_output (Type B) payload (API create/new version). */
export function validateBashPredictOutputPayload(payload: {
  type?: unknown;
  prompt?: unknown;
  scriptSource?: unknown;
  expectedOutput?: unknown;
}): ValidationResult {
  const errors: string[] = [];
  if (payload.type !== "bash_predict_output") {
    errors.push("type must be 'bash_predict_output'");
  }
  if (typeof payload.prompt !== "string" || !payload.prompt.trim()) {
    errors.push("prompt is required and must be a non-empty string");
  }
  if (typeof payload.scriptSource !== "string" || !payload.scriptSource.trim()) {
    errors.push("scriptSource is required and must be a non-empty string");
  }
  if (typeof payload.expectedOutput !== "string") {
    errors.push("expectedOutput is required (may be empty string)");
  }
  return { valid: errors.length === 0, errors };
}

/** Full validation for an upload (new question). folderName = expected id. */
export function validateQuestionUpload(
  folderName: string,
  files: { name: string; content?: string }[]
): ValidationResult {
  const errors: string[] = [];
  const metaFile = files.find((f) => f.name === "meta.yaml");
  if (!metaFile) {
    return { valid: false, errors: ["meta.yaml is required"] };
  }
  let metaParsed: unknown;
  try {
    metaParsed = yaml.load(metaFile.content ?? "");
  } catch (e) {
    return {
      valid: false,
      errors: [`meta.yaml is not valid YAML: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  const { meta, errors: metaErrors } = validateMetaYaml(metaParsed, folderName);
  errors.push(...metaErrors);
  if (!meta) {
    return { valid: false, errors };
  }

  const promptCheck = validatePromptPresence(files);
  if (!promptCheck.valid) errors.push(...promptCheck.errors);

  const typeCheck = validateTypeSpecificFiles(meta.type, files);
  if (!typeCheck.valid) errors.push(...typeCheck.errors);

  if (meta.type === "multiple_choice") {
    const optFile = files.find((f) => f.name === "options.yaml");
    if (optFile) {
      let optParsed: unknown;
      try {
        optParsed = yaml.load(optFile.content ?? "");
      } catch (e) {
        errors.push(
          `options.yaml is not valid YAML: ${e instanceof Error ? e.message : String(e)}`
        );
      }
      if (optParsed !== undefined) {
        const optCheck = validateOptionsYaml(optParsed, meta.type);
        if (!optCheck.valid) errors.push(...optCheck.errors);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
