import { describe, it, expect } from "vitest";
import { parseSetYamlFromContent } from "./load-fs";

describe("parseSetYamlFromContent", () => {
  it("parses minimal set.yaml", () => {
    const yaml = `
id: my-set
title: My set
question_logical_ids:
  - q1
  - q2
`;
    const set = parseSetYamlFromContent(yaml, "my-set");
    expect(set).not.toBeNull();
    expect(set!.title).toBe("My set");
    expect(set!.questionLogicalIds).toEqual(["q1", "q2"]);
  });

  it("returns null when folder id mismatches", () => {
    const yaml = `
id: other
title: T
question_logical_ids: []
`;
    expect(parseSetYamlFromContent(yaml, "my-set")).toBeNull();
  });
});
