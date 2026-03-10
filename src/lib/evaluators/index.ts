import type { ParsedQuestion } from "@/lib/questions/types";
import type { EvaluationResult } from "./types";
import { evaluateMultipleChoice } from "./multiple-choice";
import { evaluateShortAnswer } from "./short-answer";
import { evaluateBash, type EvaluationContext } from "./bash";
import { evaluateBashPredictOutput } from "./bash-predict-output";

export type { EvaluationResult } from "./types";
export type { EvaluationContext } from "./bash";

export async function evaluate(
  question: ParsedQuestion,
  answer: string,
  context?: EvaluationContext
): Promise<EvaluationResult> {
  switch (question.type) {
    case "multiple_choice":
      return evaluateMultipleChoice(question, answer);
    case "short_answer":
    case "long_answer":
      return evaluateShortAnswer(question, answer);
    case "bash":
      return evaluateBash(question, answer, context);
    case "bash_predict_output":
      return evaluateBashPredictOutput(question, answer);
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
