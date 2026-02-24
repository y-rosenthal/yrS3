/**
 * Parse uploaded files into ParsedQuestion per QUESTION-FORMAT-0.0.1.
 * Prompt: use prompt.md if present, else prompt.txt.
 */

import yaml from "js-yaml";
import type {
  ParsedQuestion,
  MetaYaml,
  OptionsYaml,
  MultipleChoiceOption,
  ExpectedYaml,
  RubricYaml,
  TestCaseYaml,
  QuestionType,
} from "./types";
import { QUESTION_TYPES } from "./types";

export interface QuestionFile {
  name: string;
  content: string;
}

function getPrompt(files: QuestionFile[]): { content: string; format: "md" | "txt" } | null {
  const md = files.find((f) => f.name === "prompt.md");
  const txt = files.find((f) => f.name === "prompt.txt");
  if (md) return { content: md.content, format: "md" };
  if (txt) return { content: txt.content, format: "txt" };
  return null;
}

export function parseQuestion(
  folderName: string,
  files: QuestionFile[]
): { question: ParsedQuestion; error?: string } {
  const metaFile = files.find((f) => f.name === "meta.yaml");
  if (!metaFile) {
    return { question: null as unknown as ParsedQuestion, error: "meta.yaml missing" };
  }
  let meta: MetaYaml;
  try {
    const loaded = yaml.load(metaFile.content) as MetaYaml;
    if (!loaded?.id || !loaded?.type || !loaded?.version) {
      return { question: null as unknown as ParsedQuestion, error: "meta.yaml missing id/type/version" };
    }
    meta = loaded;
  } catch {
    return { question: null as unknown as ParsedQuestion, error: "meta.yaml invalid YAML" };
  }

  const prompt = getPrompt(files);
  if (!prompt) {
    return { question: null as unknown as ParsedQuestion, error: "prompt.md or prompt.txt required" };
  }

  const question: ParsedQuestion = {
    id: meta.id,
    type: meta.type as QuestionType,
    version: meta.version,
    title: meta.title,
    domain: meta.domain,
    created_at: meta.created_at,
    modified_at: meta.modified_at,
    prompt: prompt.content,
    promptFormat: prompt.format,
    _files: files.map((f) => f.name),
  };

  if (meta.type === "multiple_choice") {
    const optFile = files.find((f) => f.name === "options.yaml");
    if (optFile) {
      try {
        const o = yaml.load(optFile.content) as OptionsYaml;
        if (Array.isArray(o)) {
          question.options = o as MultipleChoiceOption[];
        } else if (o?.options) {
          question.options = o.options;
          question.correctId = o.correct_id;
        }
        const correct = question.options?.find((opt) => opt.correct === true);
        if (correct) question.correctId = correct.id;
      } catch {
        // leave options undefined on parse error
      }
    }
  }

  if (meta.type === "short_answer" || meta.type === "long_answer") {
    const expFile = files.find((f) => f.name === "expected.yaml");
    if (expFile) {
      try {
        question.expected = yaml.load(expFile.content) as ExpectedYaml;
      } catch {
        // ignore
      }
    }
    const rubFile = files.find((f) => f.name === "rubric.yaml");
    if (rubFile) {
      try {
        question.rubric = yaml.load(rubFile.content) as RubricYaml;
      } catch {
        // ignore
      }
    }
  }

  if (meta.type === "r" || meta.type === "bash") {
    const solR = files.find((f) => f.name === "solution.R");
    const solSh = files.find((f) => f.name === "solution.sh");
    if (solR) question.solutionScript = solR.content;
    if (solSh) question.solutionScript = solSh.content;
    const testsFile = files.find((f) => f.name === "tests.yaml");
    if (testsFile) {
      try {
        const t = yaml.load(testsFile.content);
        question.tests = Array.isArray(t) ? (t as TestCaseYaml[]) : [];
      } catch {
        question.tests = [];
      }
    }
  }

  return { question };
}
