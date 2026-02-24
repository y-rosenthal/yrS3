import type { ParsedQuestion } from "@/lib/questions/types";
import type { EvaluationResult } from "./types";

export function evaluateMultipleChoice(
  question: ParsedQuestion,
  answer: string
): EvaluationResult {
  const correctId = question.correctId ?? question.options?.find((o) => o.correct)?.id;
  const maxScore = 1;
  const passed = answer?.trim() === correctId;
  return {
    score: passed ? 1 : 0,
    maxScore,
    passed,
    feedback: passed ? "Correct." : `The correct answer is ${correctId}.`,
  };
}
