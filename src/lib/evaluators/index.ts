import type { ParsedQuestion } from "@/lib/questions/types";
import type { EvaluationResult } from "./types";
import { evaluateMultipleChoice } from "./multiple-choice";
import { evaluateShortAnswer } from "./short-answer";
import { evaluateBash } from "./bash";

export type { EvaluationResult } from "./types";

export async function evaluate(
  question: ParsedQuestion,
  answer: string
): Promise<EvaluationResult> {
  switch (question.type) {
    case "multiple_choice":
      return evaluateMultipleChoice(question, answer);
    case "short_answer":
    case "long_answer":
      return evaluateShortAnswer(question, answer);
    case "bash":
      return evaluateBash(question, answer);
    case "r":
      return {
        score: 0,
        maxScore: 1,
        passed: false,
        feedback: "R grading not implemented in this MVP.",
      };
    default:
      return {
        score: 0,
        maxScore: 1,
        passed: false,
        feedback: `Unsupported question type: ${question.type}`,
      };
  }
}
