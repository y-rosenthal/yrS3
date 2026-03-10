import { describe, it, expect } from "vitest";
import { evaluateShortAnswer } from "./short-answer";
import type { ParsedQuestion } from "@/lib/questions/types";

function question(overrides: Partial<ParsedQuestion> & { prompt: string }): ParsedQuestion {
  return {
    id: "q",
    type: "short_answer",
    version: "1.0.0.0",
    prompt: overrides.prompt,
    promptFormat: "md",
    ...overrides,
  } as ParsedQuestion;
}

describe("evaluateShortAnswer", () => {
  it("returns score 0 and failed when no expected configured", () => {
    const q = question({ prompt: "Q?", expected: undefined });
    const result = evaluateShortAnswer(q, "anything");
    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(1);
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("No expected answer");
  });

  it("passes when answer matches single expected (exact)", () => {
    const q = question({ prompt: "Q?", expected: { answer: "Paris" } });
    const result = evaluateShortAnswer(q, "Paris");
    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
    expect(result.feedback).toBe("Correct.");
  });

  it("fails when answer does not match single expected", () => {
    const q = question({ prompt: "Q?", expected: { answer: "Paris" } });
    const result = evaluateShortAnswer(q, "London");
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("does not match");
  });

  it("passes when answer matches one of expected.answers", () => {
    const q = question({
      prompt: "Q?",
      expected: { answers: ["Paris", "paris", "PARIS"] },
    });
    const result = evaluateShortAnswer(q, "Paris");
    expect(result.passed).toBe(true);
    expect(evaluateShortAnswer(q, "paris").passed).toBe(true);
  });

  it("normalizes: trims and lowercases before comparing", () => {
    const q = question({ prompt: "Q?", expected: { answer: "Paris" } });
    expect(evaluateShortAnswer(q, "  paris  ").passed).toBe(true);
    expect(evaluateShortAnswer(q, "PARIS").passed).toBe(true);
  });

  it("normalizes: collapses whitespace", () => {
    const q = question({ prompt: "Q?", expected: { answer: "new york" } });
    expect(evaluateShortAnswer(q, "new   york").passed).toBe(true);
    expect(evaluateShortAnswer(q, "  new \t york  ").passed).toBe(true);
  });

  it("fails when answer is empty and expected is set", () => {
    const q = question({ prompt: "Q?", expected: { answer: "x" } });
    const result = evaluateShortAnswer(q, "");
    expect(result.passed).toBe(false);
  });
});
