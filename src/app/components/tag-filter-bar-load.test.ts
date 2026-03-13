import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchAvailableTags } from "./tag-filter-bar-load";

describe("fetchAvailableTags", () => {
  let fetchStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchStub = vi.fn(() => Promise.reject(new Error("fetch not mocked")));
    vi.stubGlobal("fetch", fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns taxonomy paths when GET /api/tags returns array of objects with path", async () => {
    fetchStub.mockImplementation((url: string) => {
      if (url === "/api/tags") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: "1", path: "programming/python/if", name: "if" },
              { id: "2", path: "programming/bash/if", name: "if" },
            ]),
        } as Response);
      }
      return Promise.reject(new Error("unexpected url"));
    });
    const tags = await fetchAvailableTags();
    expect(tags).toEqual(["programming/python/if", "programming/bash/if"]);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub).toHaveBeenCalledWith("/api/tags");
  });

  it("returns flat string array when GET /api/tags returns array of strings", async () => {
    fetchStub.mockImplementation((url: string) => {
      if (url === "/api/tags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(["bash", "intro", "week-1"]),
        } as Response);
      }
      return Promise.reject(new Error("unexpected url"));
    });
    const tags = await fetchAvailableTags();
    expect(tags).toEqual(["bash", "intro", "week-1"]);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it("falls back to GET /api/questions/tags when GET /api/tags returns !res.ok", async () => {
    fetchStub.mockImplementation((url: string) => {
      if (url === "/api/tags") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve([]) } as Response);
      }
      if (url === "/api/questions/tags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(["fallback-a", "fallback-b"]),
        } as Response);
      }
      return Promise.reject(new Error("unexpected url"));
    });
    const tags = await fetchAvailableTags();
    expect(tags).toEqual(["fallback-a", "fallback-b"]);
    expect(fetchStub).toHaveBeenCalledWith("/api/tags");
    expect(fetchStub).toHaveBeenCalledWith("/api/questions/tags");
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it("falls back to GET /api/questions/tags when GET /api/tags returns non-JSON body", async () => {
    fetchStub.mockImplementation((url: string) => {
      if (url === "/api/tags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.reject(new SyntaxError("Unexpected token <")),
        } as Response);
      }
      if (url === "/api/questions/tags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(["from-fallback"]),
        } as Response);
      }
      return Promise.reject(new Error("unexpected url"));
    });
    const tags = await fetchAvailableTags();
    expect(tags).toEqual(["from-fallback"]);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it("falls back when GET /api/tags returns non-array JSON", async () => {
    fetchStub.mockImplementation((url: string) => {
      if (url === "/api/tags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ error: "something" }),
        } as Response);
      }
      if (url === "/api/questions/tags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(["fallback-only"]),
        } as Response);
      }
      return Promise.reject(new Error("unexpected url"));
    });
    const tags = await fetchAvailableTags();
    expect(tags).toEqual(["fallback-only"]);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it("returns empty array when both fetches fail", async () => {
    fetchStub.mockImplementation(() => Promise.reject(new Error("network error")));
    const tags = await fetchAvailableTags();
    expect(tags).toEqual([]);
  });

  it("returns empty array when /api/tags fails and fallback returns non-array", async () => {
    fetchStub.mockImplementation((url: string) => {
      if (url === "/api/tags") {
        return Promise.resolve({ ok: false } as Response);
      }
      if (url === "/api/questions/tags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ not: "an array" }),
        } as Response);
      }
      return Promise.reject(new Error("unexpected url"));
    });
    const tags = await fetchAvailableTags();
    expect(tags).toEqual([]);
  });

  it("returns empty array when taxonomy returns empty array", async () => {
    fetchStub.mockImplementation((url: string) => {
      if (url === "/api/tags") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      }
      return Promise.reject(new Error("unexpected url"));
    });
    const tags = await fetchAvailableTags();
    expect(tags).toEqual([]);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });
});
