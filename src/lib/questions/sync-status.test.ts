import { describe, it, expect } from "vitest";
import {
  getSyncStatus,
  setSyncStatusRan,
  setSyncStatusSkipped,
} from "./sync-status";

describe("sync-status", () => {
  it("getSyncStatus returns current state", () => {
    setSyncStatusRan({ imported: 0, conflictsResolved: 0, errors: [] });
    const s = getSyncStatus();
    expect(s.status).toBe("ran");
    expect(s.imported).toBe(0);
    expect(s.conflictsResolved).toBe(0);
    expect(Array.isArray(s.errors)).toBe(true);
  });

  it("setSyncStatusRan updates state", () => {
    setSyncStatusRan({
      imported: 2,
      conflictsResolved: 1,
      errors: ["err1"],
    });
    const s = getSyncStatus();
    expect(s.status).toBe("ran");
    expect(s.imported).toBe(2);
    expect(s.conflictsResolved).toBe(1);
    expect(s.errors).toEqual(["err1"]);
    expect(s.lastUpdatedAt).toBeDefined();
  });

  it("setSyncStatusSkipped updates state", () => {
    setSyncStatusSkipped("Default user not found");
    const s = getSyncStatus();
    expect(s.status).toBe("skipped");
    expect(s.reason).toBe("Default user not found");
    expect(s.lastUpdatedAt).toBeDefined();
  });

  it("returns a new object so top-level mutation does not affect store", () => {
    setSyncStatusRan({ imported: 1, conflictsResolved: 0, errors: [] });
    const s = getSyncStatus();
    expect(s.status).toBe("ran");
    expect(s.imported).toBe(1);
    s.imported = 999;
    const s2 = getSyncStatus();
    expect(s2.imported).toBe(1);
  });
});
