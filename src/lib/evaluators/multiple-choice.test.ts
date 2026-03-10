import { describe, it, expect } from "vitest";
import { evaluateMultipleChoice } from "./multiple-choice";
import type { ParsedQuestion } from "@/lib/questions/types";

function question(overrides: Partial<ParsedQuestion> & { prompt: string }): ParsedQuestion {
  return {
    id: "q",
    type: "multiple_choice",
    version: "1.0.0.0",
    prompt: overrides.prompt,
    promptFormat: "md",
    ...overrides,
  } as ParsedQuestion;
}

describe("evaluateMultipleChoice", () => {
  it("passes when answer matches correctId", () => {
    const q = question({
      prompt: "Q?",
      correctId: "b",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    });
    const result = evaluateMultipleChoice(q, "b");
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(1);
    expect(result.passed).toBe(true);
    expect(result.feedback).toBe("Correct.");
  });

  it("passes when answer matches correctId with trim", () => {
    const q = question({ prompt: "Q?", correctId: "b" });
    expect(evaluateMultipleChoice(q, "  b  ").passed).toBe(true);
  });

  it("fails when answer is wrong id", () => {
    const q = question({ prompt: "Q?", correctId: "b" });
    const result = evaluateMultipleChoice(q, "a");
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("correct answer is b");
  });

  it("uses options[].correct when correctId not set", () => {
    const q = question({
      prompt: "Q?",
      options: [
        { id: "a", text: "A", correct: false },
        { id: "b", text: "B", correct: true },
      ],
    });
    expect(evaluateMultipleChoice(q, "b").passed).toBe(true);
    expect(evaluateMultipleChoice(q, "a").passed).toBe(false);
  });

  it("prefers correctId over options[].correct when both set", () => {
    const q = question({
      prompt: "Q?",
      correctId: "a",
      options: [
        { id: "a", text: "A", correct: false },
        { id: "b", text: "B", correct: true },
      ],
    });
    expect(evaluateMultipleChoice(q, "a").passed).toBe(true);
    expect(evaluateMultipleChoice(q, "b").passed).toBe(false);
  });

  it("fails when answer is empty", () => {
    const q = question({ prompt: "Q?", correctId: "b" });
    const result = evaluateMultipleChoice(q, "");
    expect(result.passed).toBe(false);
  });
});
