import type { ParsedQuestion } from "@/lib/questions/types";
import type { EvaluationResult } from "./types";
import { getSandboxRunner } from "@/lib/sandbox";
import { logSystem } from "@/lib/logger";

function normalize(s: string): string {
  return s.trim().replace(/\r\n/g, "\n").replace(/\n+/g, "\n");
}

/**
 * Evaluate a bash_predict_output (Type B) question: student provides expected output in text.
 * The correct answer is computed at runtime by running the script. Stored expected in the
 * question is used for editor review; if it differs from the computed answer, we use the
 * computed answer for grading and log an error for maintainers.
 */
export async function evaluateBashPredictOutput(
  question: ParsedQuestion,
  answer: string
): Promise<EvaluationResult> {
  const script = question.scriptSource;
  const maxScore = 1;
  if (!script?.trim()) {
    return {
      score: 0,
      maxScore,
      passed: false,
      feedback: "Question has no script to run; cannot grade.",
    };
  }

  const runner = getSandboxRunner();
  const result = await runner.runBash(script, undefined, 10_000);
  const calculatedExpected = normalize(result.stdout);

  const storedExpected = question.expected?.answer;
  if (storedExpected != null && storedExpected !== "") {
    const normalizedStored = normalize(storedExpected);
    if (normalizedStored !== calculatedExpected) {
      logSystem("bash_predict_output_stored_expected_mismatch", {
        questionId: question.id,
        version: question.version,
        storedPreview: normalizedStored.slice(0, 200),
        calculatedPreview: calculatedExpected.slice(0, 200),
      });
    }
  }

  const userNormalized = normalize(answer);
  const passed = userNormalized === calculatedExpected;
  return {
    score: passed ? 1 : 0,
    maxScore,
    passed,
    feedback: passed
      ? "Correct."
      : "Your answer does not match the output produced by running the script.",
  };
}
