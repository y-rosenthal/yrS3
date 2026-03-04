/**
 * Serialize question payload or ParsedQuestion to files per QUESTION-FORMAT-0.0.1.
 * Used when creating or saving a new version (UI or API).
 */

import yaml from "js-yaml";
import type {
  QuestionPayload,
  MultipleChoicePayload,
  ParsedQuestion,
  MultipleChoiceOption,
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

/**
 * Serialize a question payload to files. Supports multiple_choice only in MVP.
 */
export function serializeQuestion(
  payload: QuestionPayload,
  options: SerializeOptions
): { files: SerializedFile[]; error?: string } {
  if (payload.type === "multiple_choice") {
    return serializeMultipleChoice(payload, options);
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

  return { files };
}
