import { describe, it, expect } from "vitest";

/**
 * syncQuestionSetsFromFs requires admin client and FS; smoke test that module loads.
 */
describe("sync-question-sets", () => {
  it("exports syncQuestionSetsFromFs", async () => {
    const mod = await import("./sync-question-sets");
    expect(typeof mod.syncQuestionSetsFromFs).toBe("function");
  });
});
