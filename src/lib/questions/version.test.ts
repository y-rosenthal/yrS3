import { describe, it, expect } from "vitest";
import {
  INITIAL_VERSION,
  parseVersion,
  isValidVersion,
  compareVersion,
  formatVersion,
  bumpQuestionMajor,
  bumpQuestionMinor,
  bumpAnswerMajor,
  bumpAnswerMinor,
  bumpVersion,
  type VersionParts,
  type VersionBumpType,
} from "./version";

describe("parseVersion", () => {
  it("parses valid four-part version", () => {
    expect(parseVersion("1.0.0.0")).toEqual({
      qMaj: 1,
      qMin: 0,
      aMaj: 0,
      aMin: 0,
    });
    expect(parseVersion("2.3.1.4")).toEqual({
      qMaj: 2,
      qMin: 3,
      aMaj: 1,
      aMin: 4,
    });
  });

  it("trims whitespace", () => {
    expect(parseVersion("  1.0.0.0  ")).toEqual({
      qMaj: 1,
      qMin: 0,
      aMaj: 0,
      aMin: 0,
    });
  });

  it("returns null for invalid format", () => {
    expect(parseVersion("")).toBeNull();
    expect(parseVersion("1.0.0")).toBeNull();
    expect(parseVersion("1.0.0.0.0")).toBeNull();
    expect(parseVersion("1.0.0.a")).toBeNull();
    expect(parseVersion("x.0.0.0")).toBeNull();
    expect(parseVersion("1.0.0.-1")).toBeNull();
  });

  it("returns null when any part is negative", () => {
    // regex allows digits; we reject negative in parseInt check
    expect(parseVersion("-1.0.0.0")).toBeNull(); // or could parse -1; implementation uses trim and regex
  });
});

describe("isValidVersion", () => {
  it("returns true for valid four-part version", () => {
    expect(isValidVersion("1.0.0.0")).toBe(true);
    expect(isValidVersion("0.0.0.0")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isValidVersion("")).toBe(false);
    expect(isValidVersion("1.0.0")).toBe(false);
    expect(isValidVersion("1.0.0.0.0")).toBe(false);
  });
});

describe("compareVersion", () => {
  it("returns zero for equal versions", () => {
    expect(compareVersion("1.0.0.0", "1.0.0.0")).toBe(0);
  });

  it("returns negative when a < b", () => {
    expect(compareVersion("1.0.0.0", "2.0.0.0")).toBeLessThan(0);
    expect(compareVersion("1.0.0.0", "1.1.0.0")).toBeLessThan(0);
    expect(compareVersion("1.0.0.0", "1.0.1.0")).toBeLessThan(0);
    expect(compareVersion("1.0.0.0", "1.0.0.1")).toBeLessThan(0);
  });

  it("returns positive when a > b", () => {
    expect(compareVersion("2.0.0.0", "1.0.0.0")).toBeGreaterThan(0);
    expect(compareVersion("1.1.0.0", "1.0.0.0")).toBeGreaterThan(0);
  });

  it("treats invalid versions as less than valid", () => {
    expect(compareVersion("invalid", "1.0.0.0")).toBeLessThan(0);
    expect(compareVersion("1.0.0.0", "invalid")).toBeGreaterThan(0);
  });

  it("returns 0 when both invalid", () => {
    expect(compareVersion("x", "y")).toBe(0);
  });
});

describe("formatVersion", () => {
  it("serializes VersionParts to string", () => {
    const p: VersionParts = { qMaj: 1, qMin: 2, aMaj: 3, aMin: 4 };
    expect(formatVersion(p)).toBe("1.2.3.4");
  });
});

describe("bumpQuestionMajor", () => {
  it("increments qMaj and resets qMin", () => {
    expect(bumpQuestionMajor("1.0.0.0")).toBe("2.0.0.0");
    expect(bumpQuestionMajor("1.5.0.0")).toBe("2.0.0.0");
  });

  it("leaves aMaj and aMin unchanged", () => {
    expect(bumpQuestionMajor("1.0.2.3")).toBe("2.0.2.3");
  });

  it("returns null for invalid version", () => {
    expect(bumpQuestionMajor("invalid")).toBeNull();
  });
});

describe("bumpQuestionMinor", () => {
  it("increments qMin only", () => {
    expect(bumpQuestionMinor("1.0.0.0")).toBe("1.1.0.0");
    expect(bumpQuestionMinor("1.2.0.0")).toBe("1.3.0.0");
  });

  it("returns null for invalid version", () => {
    expect(bumpQuestionMinor("x")).toBeNull();
  });
});

describe("bumpAnswerMajor", () => {
  it("increments aMaj and resets aMin", () => {
    expect(bumpAnswerMajor("1.0.0.0")).toBe("1.0.1.0");
    expect(bumpAnswerMajor("1.0.1.3")).toBe("1.0.2.0");
  });

  it("returns null for invalid version", () => {
    expect(bumpAnswerMajor("bad")).toBeNull();
  });
});

describe("bumpAnswerMinor", () => {
  it("increments aMin only", () => {
    expect(bumpAnswerMinor("1.0.0.0")).toBe("1.0.0.1");
    expect(bumpAnswerMinor("1.0.0.9")).toBe("1.0.0.10");
  });

  it("returns null for invalid version", () => {
    expect(bumpAnswerMinor("")).toBeNull();
  });
});

describe("bumpVersion", () => {
  const bumpTypes: VersionBumpType[] = [
    "question_major",
    "question_minor",
    "answer_major",
    "answer_minor",
  ];

  it("applies question_major correctly", () => {
    expect(bumpVersion("1.0.0.0", "question_major")).toBe("2.0.0.0");
  });

  it("applies question_minor correctly", () => {
    expect(bumpVersion("1.0.0.0", "question_minor")).toBe("1.1.0.0");
  });

  it("applies answer_major correctly", () => {
    expect(bumpVersion("1.0.0.0", "answer_major")).toBe("1.0.1.0");
  });

  it("applies answer_minor correctly", () => {
    expect(bumpVersion("1.0.0.0", "answer_minor")).toBe("1.0.0.1");
  });

  it("returns null for invalid current version", () => {
    for (const t of bumpTypes) {
      expect(bumpVersion("not-a-version", t)).toBeNull();
    }
  });
});

describe("INITIAL_VERSION", () => {
  it("is valid and parseable", () => {
    expect(isValidVersion(INITIAL_VERSION)).toBe(true);
    expect(parseVersion(INITIAL_VERSION)?.qMaj).toBe(1);
  });
});
