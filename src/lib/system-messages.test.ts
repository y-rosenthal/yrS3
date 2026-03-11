import { describe, it, expect, beforeEach } from "vitest";
import {
  addSystemMessage,
  getSystemMessages,
  getOlderMessages,
  getLoadOlderBatchSize,
  _resetForTesting,
} from "./system-messages";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("system-messages", () => {
  beforeEach(() => {
    _resetForTesting();
    delete process.env.SYSTEM_MESSAGE_STORE_SIZE;
    delete process.env.SYSTEM_MESSAGE_LOAD_OLDER_BATCH;
    delete process.env.LOG_FILE_PATH;
  });

  describe("addSystemMessage and getSystemMessages", () => {
    it("adds a message and returns it with generated id and timestamp", () => {
      addSystemMessage({ level: "error", message: "test" });
      const list = getSystemMessages();
      expect(list).toHaveLength(1);
      expect(list[0].message).toBe("test");
      expect(list[0].level).toBe("error");
      expect(list[0].id).toBeDefined();
      expect(list[0].timestamp).toBeDefined();
    });

    it("accepts optional id and timestamp when loading from log", () => {
      addSystemMessage({
        id: "fixed-id",
        timestamp: "2025-01-01T00:00:00.000Z",
        level: "info",
        message: "from file",
      });
      const list = getSystemMessages();
      expect(list[0].id).toBe("fixed-id");
      expect(list[0].timestamp).toBe("2025-01-01T00:00:00.000Z");
    });

    it("returns newest first", () => {
      addSystemMessage({ level: "info", message: "first" });
      addSystemMessage({ level: "info", message: "second" });
      const list = getSystemMessages();
      expect(list[0].message).toBe("second");
      expect(list[1].message).toBe("first");
    });

    it("filters by level when levelFilter is provided", () => {
      addSystemMessage({ level: "error", message: "e1" });
      addSystemMessage({ level: "info", message: "i1" });
      addSystemMessage({ level: "error", message: "e2" });
      const errors = getSystemMessages("error");
      expect(errors).toHaveLength(2);
      expect(errors.every((m) => m.level === "error")).toBe(true);
      const info = getSystemMessages(["info"]);
      expect(info).toHaveLength(1);
      expect(info[0].message).toBe("i1");
    });

    it("caps store at SYSTEM_MESSAGE_STORE_SIZE (default 1000)", () => {
      process.env.SYSTEM_MESSAGE_STORE_SIZE = "3";
      addSystemMessage({ level: "info", message: "1" });
      addSystemMessage({ level: "info", message: "2" });
      addSystemMessage({ level: "info", message: "3" });
      addSystemMessage({ level: "info", message: "4" });
      addSystemMessage({ level: "info", message: "5" });
      const list = getSystemMessages();
      expect(list).toHaveLength(3);
      expect(list.map((m) => m.message)).toEqual(["5", "4", "3"]);
    });

    it("uses default store size 1000 when env is invalid", () => {
      process.env.SYSTEM_MESSAGE_STORE_SIZE = "invalid";
      addSystemMessage({ level: "info", message: "only one" });
      expect(getSystemMessages()).toHaveLength(1);
    });
  });

  describe("getLoadOlderBatchSize", () => {
    it("returns default 100 when unset", () => {
      expect(getLoadOlderBatchSize()).toBe(100);
    });

    it("returns parsed env value when set", () => {
      process.env.SYSTEM_MESSAGE_LOAD_OLDER_BATCH = "50";
      expect(getLoadOlderBatchSize()).toBe(50);
    });

    it("returns default when env is invalid", () => {
      process.env.SYSTEM_MESSAGE_LOAD_OLDER_BATCH = "x";
      expect(getLoadOlderBatchSize()).toBe(100);
    });
  });

  describe("getOlderMessages", () => {
    it("returns empty when olderThanId not in store", async () => {
      addSystemMessage({ level: "info", message: "only" });
      const result = await getOlderMessages("nonexistent-id");
      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it("reads older messages from log file and merges into store", async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "logs-"));
      const logPath = path.join(tmpDir, "app.log");
      process.env.LOG_FILE_PATH = logPath;

      const olderId = "older-msg-id";
      const olderTs = "2024-01-01T10:00:00.000Z";
      await fs.writeFile(
        logPath,
        [
          JSON.stringify({
            id: "oldest-id",
            level: "info",
            timestamp: "2024-01-01T09:00:00.000Z",
            message: "oldest",
          }),
          JSON.stringify({
            id: olderId,
            level: "info",
            timestamp: olderTs,
            message: "older",
          }),
        ].join("\n") + "\n",
        "utf-8"
      );

      addSystemMessage({
        id: "new-id",
        timestamp: "2025-01-01T00:00:00.000Z",
        level: "info",
        message: "newest",
      });
      addSystemMessage({
        id: olderId,
        timestamp: olderTs,
        level: "info",
        message: "older",
      });

      process.env.SYSTEM_MESSAGE_LOAD_OLDER_BATCH = "10";
      const result = await getOlderMessages(olderId, "info");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe("oldest-id");
      expect(result.messages[0].message).toBe("oldest");
      expect(result.hasMore).toBe(false);

      const all = getSystemMessages();
      expect(all.some((m) => m.id === "oldest-id")).toBe(true);

      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  });
});
