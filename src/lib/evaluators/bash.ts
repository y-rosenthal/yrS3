import type { ParsedQuestion } from "@/lib/questions/types";
import type { EvaluationResult } from "./types";
import { getSandboxRunner } from "@/lib/sandbox";

export async function evaluateBash(
  question: ParsedQuestion,
  answer: string
): Promise<EvaluationResult> {
  const runner = getSandboxRunner();
  const maxScore = 1;
  const tests = question.tests ?? [{ description: "Default", stdin: "" }];
  const solutionOutputs: string[] = [];
  const solutionScript = question.solutionScript;
  if (!solutionScript) {
    return {
      score: 0,
      maxScore,
      passed: false,
      feedback: "Question has no reference solution.",
    };
  }
  for (const test of tests) {
    const stdin = test.stdin ?? "";
    const setup = test.setup ? test.setup + "\n" : "";
    const fullScript = setup + solutionScript;
    const result = await runner.runBash(fullScript, stdin, 5000);
    solutionOutputs.push(result.stdout.trim());
  }
  let passed = 0;
  const feedbackParts: string[] = [];
  for (let i = 0; i < tests.length; i++) {
    const stdin = tests[i].stdin ?? "";
    const setup = tests[i].setup ? tests[i].setup + "\n" : "";
    const userResult = await runner.runBash(setup + answer, stdin, 5000);
    const expected = solutionOutputs[i];
    const actual = userResult.stdout.trim();
    if (expected === actual) {
      passed++;
    } else {
      feedbackParts.push(
        `Test ${i + 1}: expected output did not match. Expected (first 200 chars): ${expected.slice(0, 200)}...`
      );
    }
  }
  const score = tests.length > 0 ? passed / tests.length : 0;
  return {
    score,
    maxScore: 1,
    passed: score >= 1,
    feedback:
      feedbackParts.length === 0
        ? "All tests passed."
        : feedbackParts.join(" "),
    details: { passed, total: tests.length },
  };
}
