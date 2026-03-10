import { describe, it, expect } from "vitest";
import {
  validateMetaYaml,
  validateOptionsYaml,
  validatePromptPresence,
  validateTypeSpecificFiles,
  validateMultipleChoicePayload,
  validateQuestionUpload,
} from "./validate";

describe("validateMetaYaml", () => {
  it("returns errors when meta is null or not an object", () => {
    expect(validateMetaYaml(null, "some-id").errors).toContain(
      "meta.yaml is missing or not an object"
    );
    expect(validateMetaYaml(undefined, "x").errors.length).toBeGreaterThan(0);
    expect(validateMetaYaml("string", "x").errors.length).toBeGreaterThan(0);
  });

  it("requires id to be non-empty and to match folder name", () => {
    const noId = validateMetaYaml({ type: "short_answer", version: "1.0.0.0" }, "folder");
    expect(noId.errors.some((e) => e.includes("'id'"))).toBe(true);

    const mismatch = validateMetaYaml(
      { id: "other", type: "short_answer", version: "1.0.0.0" },
      "folder"
    );
    expect(mismatch.errors.some((e) => e.includes("match folder name"))).toBe(true);

    const validId = validateMetaYaml(
      { id: "my-q", type: "short_answer", version: "1.0.0.0" },
      "my-q"
    );
    expect(validId.errors.filter((e) => e.includes("id"))).toHaveLength(0);
  });

  it("requires type to be a valid question type", () => {
    const noType = validateMetaYaml({ id: "x", version: "1.0.0.0" }, "x");
    expect(noType.errors.some((e) => e.includes("'type'"))).toBe(true);

    const badType = validateMetaYaml(
      { id: "x", type: "invalid_type", version: "1.0.0.0" },
      "x"
    );
    expect(badType.errors.some((e) => e.includes("must be one of"))).toBe(true);

    const valid = validateMetaYaml(
      { id: "x", type: "multiple_choice", version: "1.0.0.0" },
      "x"
    );
    expect(valid.meta?.type).toBe("multiple_choice");
  });

  it("requires version to be non-empty and four-part", () => {
    const noVersion = validateMetaYaml({ id: "x", type: "short_answer" }, "x");
    expect(noVersion.errors.some((e) => e.includes("'version'"))).toBe(true);

    const badVersion = validateMetaYaml(
      { id: "x", type: "short_answer", version: "1.0" },
      "x"
    );
    expect(badVersion.errors.some((e) => e.includes("four-part"))).toBe(true);

    const valid = validateMetaYaml(
      { id: "x", type: "short_answer", version: "1.0.0.0" },
      "x"
    );
    expect(valid.meta?.version).toBe("1.0.0.0");
    expect(valid.errors).toHaveLength(0);
  });

  it("returns meta with optional fields when valid", () => {
    const input = {
      id: "q1",
      type: "short_answer",
      version: "1.0.0.0",
      title: "A title",
      domain: "math",
    };
    const result = validateMetaYaml(input, "q1");
    expect(result.errors).toHaveLength(0);
    expect(result.meta?.id).toBe("q1");
    expect(result.meta?.title).toBe("A title");
    expect(result.meta?.domain).toBe("math");
  });
});

describe("validateOptionsYaml", () => {
  it("returns valid for non-multiple_choice type", () => {
    expect(validateOptionsYaml(null, "short_answer")).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("requires options for multiple_choice", () => {
    const result = validateOptionsYaml(null, "multiple_choice");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("options.yaml is required"))).toBe(true);
  });

  it("accepts array of options with one correct", () => {
    const options = [
      { id: "a", text: "Option A", correct: false },
      { id: "b", text: "Option B", correct: true },
    ];
    expect(validateOptionsYaml(options, "multiple_choice")).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("accepts object with options and correct_id", () => {
    const options = {
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B", correct: true },
      ],
    };
    expect(validateOptionsYaml(options, "multiple_choice")).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects empty options list", () => {
    const result = validateOptionsYaml([], "multiple_choice");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("must not be empty"))).toBe(true);
  });

  it("rejects when no option has correct: true", () => {
    const options = [
      { id: "a", text: "A", correct: false },
      { id: "b", text: "B" },
    ];
    const result = validateOptionsYaml(options, "multiple_choice");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Exactly one option"))).toBe(true);
  });

  it("rejects when more than one option has correct: true", () => {
    const options = [
      { id: "a", text: "A", correct: true },
      { id: "b", text: "B", correct: true },
    ];
    const result = validateOptionsYaml(options, "multiple_choice");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Only one option"))).toBe(true);
  });

  it("rejects duplicate option ids", () => {
    const options = [
      { id: "x", text: "A", correct: false },
      { id: "x", text: "B", correct: true },
    ];
    const result = validateOptionsYaml(options, "multiple_choice");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate option id"))).toBe(true);
  });
});

describe("validatePromptPresence", () => {
  it("returns error when neither prompt.md nor prompt.txt present", () => {
    const result = validatePromptPresence([{ name: "meta.yaml" }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("prompt"))).toBe(true);
  });

  it("returns valid when prompt.md is present", () => {
    expect(validatePromptPresence([{ name: "prompt.md" }])).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("returns valid when prompt.txt is present", () => {
    expect(validatePromptPresence([{ name: "prompt.txt" }])).toEqual({
      valid: true,
      errors: [],
    });
  });
});

describe("validateTypeSpecificFiles", () => {
  it("requires options.yaml for multiple_choice", () => {
    const result = validateTypeSpecificFiles("multiple_choice", [{ name: "meta.yaml" }]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("multiple_choice requires options.yaml");
  });

  it("passes multiple_choice when options.yaml present", () => {
    const result = validateTypeSpecificFiles("multiple_choice", [
      { name: "meta.yaml" },
      { name: "options.yaml" },
    ]);
    expect(result.valid).toBe(true);
  });

  it("requires solution.R for type r", () => {
    const result = validateTypeSpecificFiles("r", [{ name: "meta.yaml" }]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("type 'r' requires solution.R");
  });

  it("requires solution.sh for type bash", () => {
    const result = validateTypeSpecificFiles("bash", [{ name: "meta.yaml" }]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("type 'bash' requires solution.sh");
  });

  it("passes for short_answer with no extra files required", () => {
    expect(validateTypeSpecificFiles("short_answer", [])).toEqual({
      valid: true,
      errors: [],
    });
  });
});

describe("validateMultipleChoicePayload", () => {
  it("requires type to be multiple_choice", () => {
    const result = validateMultipleChoicePayload({
      type: "short_answer",
      prompt: "Q?",
      options: [{ id: "a", text: "A", correct: true }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("type must be 'multiple_choice'");
  });

  it("requires non-empty prompt", () => {
    const result = validateMultipleChoicePayload({
      type: "multiple_choice",
      prompt: "",
      options: [{ id: "a", text: "A", correct: true }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("prompt"))).toBe(true);
  });

  it("requires non-empty options array", () => {
    const result = validateMultipleChoicePayload({
      type: "multiple_choice",
      prompt: "Q?",
      options: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("options"))).toBe(true);
  });

  it("returns valid for correct payload", () => {
    const result = validateMultipleChoicePayload({
      type: "multiple_choice",
      prompt: "What is 2+2?",
      options: [
        { id: "a", text: "3", correct: false },
        { id: "b", text: "4", correct: true },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("delegates option validation and returns option errors", () => {
    const result = validateMultipleChoicePayload({
      type: "multiple_choice",
      prompt: "Q?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("correct"))).toBe(true);
  });
});

describe("validateQuestionUpload", () => {
  it("returns error when meta.yaml is missing", () => {
    const result = validateQuestionUpload("my-id", [
      { name: "prompt.md", content: "# Q" },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("meta.yaml is required");
  });

  it("returns error when meta is invalid YAML", () => {
    const result = validateQuestionUpload("my-id", [
      { name: "meta.yaml", content: "not: valid: yaml: [" },
      { name: "prompt.md", content: "# Q" },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("meta.yaml"))).toBe(true);
  });

  it("returns error when id does not match folder name", () => {
    const result = validateQuestionUpload("folder-name", [
      {
        name: "meta.yaml",
        content: "id: other-id\ntype: short_answer\nversion: 1.0.0.0\n",
      },
      { name: "prompt.md", content: "# Q" },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("match folder name") || e.includes("id"))).toBe(
      true
    );
  });

  it("returns valid for minimal short_answer upload", () => {
    const result = validateQuestionUpload("my-q", [
      {
        name: "meta.yaml",
        content: "id: my-q\ntype: short_answer\nversion: 1.0.0.0\n",
      },
      { name: "prompt.md", content: "# Question" },
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
