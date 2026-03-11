import { describe, it, expect, vi, beforeEach } from "vitest";
import * as systemMessages from "./system-messages";
import { report, reportError, reportWarning, reportInfo } from "./report";

describe("report", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    systemMessages._resetForTesting?.();
  });

  it("report() adds message with id and timestamp to store", () => {
    const spy = vi.spyOn(systemMessages, "addSystemMessage");
    report("info", "test message");
    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0][0];
    expect(call).toMatchObject({ level: "info", message: "test message" });
    expect(call.id).toBeDefined();
    expect(typeof call.id).toBe("string");
    expect(call.timestamp).toBeDefined();
    expect(typeof call.timestamp).toBe("string");
  });

  it("report() with Error uses message and stack", () => {
    const err = new Error("fail");
    err.stack = "Error: fail\n  at line 1";
    const spy = vi.spyOn(systemMessages, "addSystemMessage");
    report("error", err);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        message: "fail",
        stack: "Error: fail\n  at line 1",
      })
    );
  });

  it("reportError calls report with level error", () => {
    const spy = vi.spyOn(systemMessages, "addSystemMessage");
    reportError("oops");
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ level: "error", message: "oops" }));
  });

  it("reportWarning and reportInfo use correct levels", () => {
    const spy = vi.spyOn(systemMessages, "addSystemMessage");
    reportWarning("warn");
    reportInfo("info");
    expect(spy).toHaveBeenNthCalledWith(1, expect.objectContaining({ level: "warning", message: "warn" }));
    expect(spy).toHaveBeenNthCalledWith(2, expect.objectContaining({ level: "info", message: "info" }));
  });
});
