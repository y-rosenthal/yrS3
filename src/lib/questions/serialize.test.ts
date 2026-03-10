import { describe, it, expect } from "vitest";
import {
  serializeQuestion,
  serializeBash,
  serializeBashPredictOutput,
} from "./serialize";

describe("serializeBash", () => {
  it("produces meta.yaml, prompt.md, solution.sh", () => {
    const { files } = serializeBash(
      {
        type: "bash",
        prompt: "Write ls",
        solutionScript: "ls -1",
      },
      { logicalId: "b1", version: "1.0.0.0" }
    );
    const names = files.map((f) => f.name);
    expect(names).toContain("meta.yaml");
    expect(names).toContain("prompt.md");
    expect(names).toContain("solution.sh");
    expect(files.find((f) => f.name === "meta.yaml")?.content).toContain("type: bash");
    expect(files.find((f) => f.name === "solution.sh")?.content).toBe("ls -1");
  });

  it("includes sandbox_zip_ref in meta when provided", () => {
    const { files } = serializeBash(
      {
        type: "bash",
        prompt: "Q",
        solutionScript: "echo x",
        sandboxZipRef: "tree.zip",
      },
      { logicalId: "b1", version: "1.0.0.0" }
    );
    expect(files.find((f) => f.name === "meta.yaml")?.content).toContain("sandbox_zip_ref: tree.zip");
  });
});

describe("serializeBashPredictOutput", () => {
  it("produces meta.yaml, prompt.md, script.sh, expected.yaml", () => {
    const { files } = serializeBashPredictOutput(
      {
        type: "bash_predict_output",
        prompt: "What output?",
        scriptSource: "echo hello",
        expectedOutput: "hello",
      },
      { logicalId: "bpo1", version: "1.0.0.0" }
    );
    const names = files.map((f) => f.name);
    expect(names).toContain("meta.yaml");
    expect(names).toContain("prompt.md");
    expect(names).toContain("script.sh");
    expect(names).toContain("expected.yaml");
    expect(files.find((f) => f.name === "meta.yaml")?.content).toContain("bash_predict_output");
    expect(files.find((f) => f.name === "expected.yaml")?.content).toContain("hello");
  });
});

describe("serializeQuestion", () => {
  it("serializes bash payload via serializeBash", () => {
    const { files, error } = serializeQuestion(
      {
        type: "bash",
        prompt: "Q",
        solutionScript: "ls",
      },
      { logicalId: "b1", version: "1.0.0.0" }
    );
    expect(error).toBeUndefined();
    expect(files.some((f) => f.name === "solution.sh")).toBe(true);
  });

  it("serializes bash_predict_output payload via serializeBashPredictOutput", () => {
    const { files, error } = serializeQuestion(
      {
        type: "bash_predict_output",
        prompt: "Q",
        scriptSource: "echo x",
        expectedOutput: "x",
      },
      { logicalId: "bpo1", version: "1.0.0.0" }
    );
    expect(error).toBeUndefined();
    expect(files.some((f) => f.name === "script.sh")).toBe(true);
    expect(files.some((f) => f.name === "expected.yaml")).toBe(true);
  });
});
