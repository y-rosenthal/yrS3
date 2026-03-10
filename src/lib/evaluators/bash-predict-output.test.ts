import { describe, it, expect } from "vitest";
import { evaluateBashPredictOutput } from "./bash-predict-output";
import type { ParsedQuestion } from "@/lib/questions/types";

describe("evaluateBashPredictOutput", () => {
  it("returns error when scriptSource is missing", async () => {
    const q: ParsedQuestion = {
      id: "q1",
      type: "bash_predict_output",
      version: "1.0.0.0",
      prompt: "What output?",
      promptFormat: "md",
    } as ParsedQuestion;
    const result = await evaluateBashPredictOutput(q, "anything");
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("no script");
  });

  it("uses calculated output for grading and passes when student matches", async () => {
    const q: ParsedQuestion = {
      id: "q1",
      type: "bash_predict_output",
      version: "1.0.0.0",
      prompt: "What output?",
      promptFormat: "md",
      scriptSource: "echo hello",
      expected: { answer: "hello" },
    } as ParsedQuestion;
    const result = await evaluateBashPredictOutput(q, "hello");
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it("fails when student answer does not match calculated output", async () => {
    const q: ParsedQuestion = {
      id: "q1",
      type: "bash_predict_output",
      version: "1.0.0.0",
      prompt: "What output?",
      promptFormat: "md",
      scriptSource: "echo hello",
    } as ParsedQuestion;
    const result = await evaluateBashPredictOutput(q, "wrong");
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it("normalizes whitespace when comparing", async () => {
    const q: ParsedQuestion = {
      id: "q1",
      type: "bash_predict_output",
      version: "1.0.0.0",
      prompt: "What output?",
      promptFormat: "md",
      scriptSource: "echo hello",
    } as ParsedQuestion;
    const result = await evaluateBashPredictOutput(q, "  hello  ");
    expect(result.passed).toBe(true);
  });
});
