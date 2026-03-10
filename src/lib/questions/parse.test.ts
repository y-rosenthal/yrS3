import { describe, it, expect } from "vitest";
import { parseQuestion, type QuestionFile } from "./parse";

function files(list: { name: string; content: string }[]): QuestionFile[] {
  return list.map(({ name, content }) => ({ name, content }));
}

describe("parseQuestion", () => {
  it("returns error when meta.yaml is missing", () => {
    const result = parseQuestion("my-id", files([{ name: "prompt.md", content: "# Q" }]));
    expect(result.error).toBe("meta.yaml missing");
    expect(result.question).toBeDefined(); // implementation returns null-as-ParsedQuestion
  });

  it("returns error when meta.yaml has invalid YAML", () => {
    const result = parseQuestion(
      "my-id",
      files([
        { name: "meta.yaml", content: "id: [unclosed" },
        { name: "prompt.md", content: "# Q" },
      ])
    );
    expect(result.error).toBe("meta.yaml invalid YAML");
  });

  it("returns error when meta.yaml missing id, type, or version", () => {
    const result = parseQuestion(
      "my-id",
      files([
        { name: "meta.yaml", content: "id: my-id\n# type and version missing" },
        { name: "prompt.md", content: "# Q" },
      ])
    );
    expect(result.error).toBe("meta.yaml missing id/type/version");
  });

  it("returns error when neither prompt.md nor prompt.txt is present", () => {
    const result = parseQuestion(
      "my-id",
      files([
        {
          name: "meta.yaml",
          content: "id: my-id\ntype: short_answer\nversion: 1.0.0.0\n",
        },
      ])
    );
    expect(result.error).toBe("prompt.md or prompt.txt required");
  });

  it("parses minimal question and uses prompt.md when present", () => {
    const result = parseQuestion(
      "my-id",
      files([
        {
          name: "meta.yaml",
          content: "id: my-id\ntype: short_answer\nversion: 1.0.0.0\n",
        },
        { name: "prompt.md", content: "# Hello **world**" },
      ])
    );
    expect(result.error).toBeUndefined();
    expect(result.question).toBeDefined();
    expect(result.question.id).toBe("my-id");
    expect(result.question.type).toBe("short_answer");
    expect(result.question.version).toBe("1.0.0.0");
    expect(result.question.prompt).toBe("# Hello **world**");
    expect(result.question.promptFormat).toBe("md");
  });

  it("uses prompt.txt when prompt.md is not present", () => {
    const result = parseQuestion(
      "q",
      files([
        {
          name: "meta.yaml",
          content: "id: q\ntype: short_answer\nversion: 1.0.0.0\n",
        },
        { name: "prompt.txt", content: "Plain text prompt" },
      ])
    );
    expect(result.error).toBeUndefined();
    expect(result.question.prompt).toBe("Plain text prompt");
    expect(result.question.promptFormat).toBe("txt");
  });

  it("prefers prompt.md over prompt.txt when both present", () => {
    const result = parseQuestion(
      "q",
      files([
        {
          name: "meta.yaml",
          content: "id: q\ntype: short_answer\nversion: 1.0.0.0\n",
        },
        { name: "prompt.md", content: "Markdown content" },
        { name: "prompt.txt", content: "Plain content" },
      ])
    );
    expect(result.error).toBeUndefined();
    expect(result.question.prompt).toBe("Markdown content");
    expect(result.question.promptFormat).toBe("md");
  });

  it("includes _files with uploaded file names", () => {
    const result = parseQuestion(
      "q",
      files([
        {
          name: "meta.yaml",
          content: "id: q\ntype: short_answer\nversion: 1.0.0.0\n",
        },
        { name: "prompt.md", content: "Q" },
      ])
    );
    expect(result.question._files).toEqual(["meta.yaml", "prompt.md"]);
  });

  it("parses multiple_choice with options array", () => {
    const result = parseQuestion(
      "mc",
      files([
        {
          name: "meta.yaml",
          content: "id: mc\ntype: multiple_choice\nversion: 1.0.0.0\n",
        },
        { name: "prompt.md", content: "Choose one" },
        {
          name: "options.yaml",
          content: [
            "- id: a\n  text: A\n  correct: false",
            "- id: b\n  text: B\n  correct: true",
          ].join("\n"),
        },
      ])
    );
    expect(result.error).toBeUndefined();
    expect(result.question.options).toBeDefined();
    expect(result.question.options?.length).toBe(2);
    expect(result.question.correctId).toBe("b");
  });

  it("parses multiple_choice with options object (options + correct_id)", () => {
    const result = parseQuestion(
      "mc",
      files([
        {
          name: "meta.yaml",
          content: "id: mc\ntype: multiple_choice\nversion: 1.0.0.0\n",
        },
        { name: "prompt.md", content: "Choose" },
        {
          name: "options.yaml",
          content: "options:\n  - id: a\n    text: A\n  - id: b\n    text: B\n    correct: true\ncorrect_id: b\n",
        },
      ])
    );
    expect(result.error).toBeUndefined();
    expect(result.question.options?.length).toBe(2);
    expect(result.question.correctId).toBe("b");
  });

  it("parses short_answer with expected.yaml", () => {
    const result = parseQuestion(
      "sa",
      files([
        {
          name: "meta.yaml",
          content: "id: sa\ntype: short_answer\nversion: 1.0.0.0\n",
        },
        { name: "prompt.md", content: "Answer?" },
        { name: "expected.yaml", content: 'answer: "42"\n' },
      ])
    );
    expect(result.error).toBeUndefined();
    expect(result.question.expected).toEqual({ answer: "42" });
  });

  it("parses bash_predict_output with script.sh and expected.yaml", () => {
    const result = parseQuestion(
      "bpo",
      files([
        {
          name: "meta.yaml",
          content: "id: bpo\ntype: bash_predict_output\nversion: 1.0.0.0\n",
        },
        { name: "prompt.md", content: "What output?" },
        { name: "script.sh", content: "echo hello" },
        { name: "expected.yaml", content: 'answer: "hello"\n' },
      ])
    );
    expect(result.error).toBeUndefined();
    expect(result.question.type).toBe("bash_predict_output");
    expect(result.question.scriptSource).toBe("echo hello");
    expect(result.question.expected).toEqual({ answer: "hello" });
  });

  it("parses bash with sandbox_zip_ref from meta", () => {
    const result = parseQuestion(
      "b",
      files([
        {
          name: "meta.yaml",
          content: 'id: b\ntype: bash\nversion: 1.0.0.0\nsandbox_zip_ref: tree.zip\n',
        },
        { name: "prompt.md", content: "Do something" },
        { name: "solution.sh", content: "ls -la" },
      ])
    );
    expect(result.error).toBeUndefined();
    expect(result.question.type).toBe("bash");
    expect(result.question.sandboxZipRef).toBe("tree.zip");
  });
});
