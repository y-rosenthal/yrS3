import type { ParsedQuestion } from "@/lib/questions/types";
import type { EvaluationResult } from "./types";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function evaluateShortAnswer(
  question: ParsedQuestion,
  answer: string
): EvaluationResult {
  const expected = question.expected;
  const maxScore = 1;
  if (!expected) {
    return {
      score: 0,
      maxScore,
      passed: false,
      feedback: "No expected answer configured; cannot grade.",
    };
  }
  const user = normalize(answer);
  const accepted = expected.answer
    ? [normalize(expected.answer)]
    : (expected.answers ?? []).map(normalize);
  const passed = accepted.length > 0 && accepted.some((a) => a === user);
  return {
    score: passed ? 1 : 0,
    maxScore,
    passed,
    feedback: passed ? "Correct." : "Your answer does not match the expected answer(s).",
  };
}
