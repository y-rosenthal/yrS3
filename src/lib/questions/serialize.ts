/**
 * Serialize question payload or ParsedQuestion to files per QUESTION-FORMAT-0.0.1.
 * Used when creating or saving a new version (UI or API).
 */

import yaml from "js-yaml";
import type {
  QuestionPayload,
  MultipleChoicePayload,
  BashPayload,
  BashPredictOutputPayload,
  ParsedQuestion,
  MultipleChoiceOption,
  TestCaseYaml,
} from "./types";
import { isValidVersion } from "./version";

export interface SerializedFile {
  name: string;
  content: string;
}

export interface SerializeOptions {
  logicalId: string;
  version: string;
  created_at?: string;
  modified_at?: string;
}

/**
 * Serialize a multiple_choice payload to format files.
 * Validates version format; returns error if invalid.
 */
export function serializeMultipleChoice(
  payload: MultipleChoicePayload,
  options: SerializeOptions
): { files: SerializedFile[]; error?: string } {
  if (!isValidVersion(options.version)) {
    return { files: [], error: "Invalid version format (expected Q_MAJ.Q_MIN.A_MAJ.A_MIN)" };
  }
  const meta: Record<string, unknown> = {
    id: options.logicalId,
    type: "multiple_choice",
    version: options.version,
  };
  if (payload.title != null) meta.title = payload.title;
  if (payload.domain != null) meta.domain = payload.domain;
  if (options.created_at) meta.created_at = options.created_at;
  if (options.modified_at) meta.modified_at = options.modified_at;

  const optionsYaml = payload.options.map((opt) => ({
    id: opt.id,
    text: opt.text,
    ...(opt.correct === true ? { correct: true } : {}),
  }));

  const files: SerializedFile[] = [
    { name: "meta.yaml", content: yaml.dump(meta, { lineWidth: -1 }) },
    { name: "prompt.md", content: payload.prompt || "" },
    { name: "options.yaml", content: yaml.dump(optionsYaml, { lineWidth: -1 }) },
  ];
  return { files };
}

/** Serialize a bash (Type A) payload to format files. */
export function serializeBash(
  payload: BashPayload,
  options: SerializeOptions
): { files: SerializedFile[]; error?: string } {
  if (!isValidVersion(options.version)) {
    return { files: [], error: "Invalid version format (expected Q_MAJ.Q_MIN.A_MAJ.A_MIN)" };
  }
  const meta: Record<string, unknown> = {
    id: options.logicalId,
    type: "bash",
    version: options.version,
  };
  if (payload.title != null) meta.title = payload.title;
  if (payload.domain != null) meta.domain = payload.domain;
  if (payload.sandboxZipRef != null) meta.sandbox_zip_ref = payload.sandboxZipRef;
  if (options.created_at) meta.created_at = options.created_at;
  if (options.modified_at) meta.modified_at = options.modified_at;

  const files: SerializedFile[] = [
    { name: "meta.yaml", content: yaml.dump(meta, { lineWidth: -1 }) },
    { name: "prompt.md", content: payload.prompt || "" },
    { name: "solution.sh", content: payload.solutionScript || "" },
  ];
  if (payload.tests?.length) {
    files.push({ name: "tests.yaml", content: yaml.dump(payload.tests as TestCaseYaml[], { lineWidth: -1 }) });
  }
  return { files };
}

/** Serialize a bash_predict_output (Type B) payload to format files. */
export function serializeBashPredictOutput(
  payload: BashPredictOutputPayload,
  options: SerializeOptions
): { files: SerializedFile[]; error?: string } {
  if (!isValidVersion(options.version)) {
    return { files: [], error: "Invalid version format (expected Q_MAJ.Q_MIN.A_MAJ.A_MIN)" };
  }
  const meta: Record<string, unknown> = {
    id: options.logicalId,
    type: "bash_predict_output",
    version: options.version,
  };
  if (payload.title != null) meta.title = payload.title;
  if (payload.domain != null) meta.domain = payload.domain;
  if (options.created_at) meta.created_at = options.created_at;
  if (options.modified_at) meta.modified_at = options.modified_at;

  const files: SerializedFile[] = [
    { name: "meta.yaml", content: yaml.dump(meta, { lineWidth: -1 }) },
    { name: "prompt.md", content: payload.prompt || "" },
    { name: "script.sh", content: payload.scriptSource || "" },
    { name: "expected.yaml", content: yaml.dump({ answer: payload.expectedOutput }, { lineWidth: -1 }) },
  ];
  return { files };
}

/**
 * Serialize a question payload to files.
 */
export function serializeQuestion(
  payload: QuestionPayload,
  options: SerializeOptions
): { files: SerializedFile[]; error?: string } {
  if (payload.type === "multiple_choice") {
    return serializeMultipleChoice(payload, options);
  }
  if (payload.type === "bash") {
    return serializeBash(payload, options);
  }
  if (payload.type === "bash_predict_output") {
    return serializeBashPredictOutput(payload, options);
  }
  return { files: [], error: `Unsupported question type for serialization: ${(payload as { type: string }).type}` };
}

/**
 * Serialize a ParsedQuestion back to files (e.g. when creating a new version from existing).
 * Uses promptFormat to choose prompt.md or prompt.txt.
 */
export function serializeParsedQuestion(
  question: ParsedQuestion,
  options: SerializeOptions
): { files: SerializedFile[]; error?: string } {
  if (!isValidVersion(options.version)) {
    return { files: [], error: "Invalid version format (expected Q_MAJ.Q_MIN.A_MAJ.A_MIN)" };
  }
  const meta: Record<string, unknown> = {
    id: options.logicalId,
    type: question.type,
    version: options.version,
  };
  if (question.title != null) meta.title = question.title;
  if (question.domain != null) meta.domain = question.domain;
  if (question.type === "bash" && question.sandboxZipRef) meta.sandbox_zip_ref = question.sandboxZipRef;
  if (options.created_at) meta.created_at = options.created_at;
  if (options.modified_at) meta.modified_at = options.modified_at;

  const files: SerializedFile[] = [
    { name: "meta.yaml", content: yaml.dump(meta, { lineWidth: -1 }) },
    {
      name: question.promptFormat === "txt" ? "prompt.txt" : "prompt.md",
      content: question.prompt || "",
    },
  ];

  if (question.type === "multiple_choice" && question.options?.length) {
    const optionsYaml = question.options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      ...(opt.id === question.correctId || opt.correct === true ? { correct: true } : {}),
    }));
    files.push({
      name: "options.yaml",
      content: yaml.dump(optionsYaml, { lineWidth: -1 }),
    });
  }

  if (question.type === "bash") {
    if (question.solutionScript != null) {
      files.push({ name: "solution.sh", content: question.solutionScript });
    }
    if (question.tests?.length) {
      files.push({
        name: "tests.yaml",
        content: yaml.dump(question.tests as TestCaseYaml[], { lineWidth: -1 }),
      });
    }
  }

  if (question.type === "bash_predict_output") {
    if (question.scriptSource != null) {
      files.push({ name: "script.sh", content: question.scriptSource });
    }
    if (question.expected != null) {
      files.push({
        name: "expected.yaml",
        content: yaml.dump(question.expected, { lineWidth: -1 }),
      });
    }
  }

  return { files };
}
