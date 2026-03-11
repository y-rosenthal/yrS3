/**
 * In-memory store for system messages (errors, warnings, info, debug) for UI display (SPEC 0.0.5).
 * Bounded to last N messages (configurable); can grow when loading older from log file.
 */

import fs from "fs/promises";
import { getLogFilePath } from "./log-file-path";

export type MessageLevel = "error" | "warning" | "info" | "debug";

export interface SystemMessage {
  id: string;
  level: MessageLevel;
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  route?: string;
}

const DEFAULT_STORE_SIZE = 1000;
const DEFAULT_LOAD_OLDER_BATCH = 100;

function getMaxStoreSize(): number {
  const v = process.env.SYSTEM_MESSAGE_STORE_SIZE;
  if (v === undefined || v === "") return DEFAULT_STORE_SIZE;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STORE_SIZE;
}

export function getLoadOlderBatchSize(): number {
  const v = process.env.SYSTEM_MESSAGE_LOAD_OLDER_BATCH;
  if (v === undefined || v === "") return DEFAULT_LOAD_OLDER_BATCH;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LOAD_OLDER_BATCH;
}

const messages: SystemMessage[] = [];

/** Reset the in-memory store (for tests only). */
export function _resetForTesting(): void {
  messages.length = 0;
}

function getMaxSize(): number {
  return getMaxStoreSize();
}

export function addSystemMessage(
  msg: Omit<SystemMessage, "id" | "timestamp"> & { id?: string; timestamp?: string }
): void {
  const id = msg.id ?? crypto.randomUUID();
  const timestamp = msg.timestamp ?? new Date().toISOString();
  const entry: SystemMessage = {
    ...msg,
    id,
    timestamp,
  };
  messages.unshift(entry);
  const max = getMaxSize();
  while (messages.length > max) {
    messages.pop();
  }
}

export function getSystemMessages(
  levelFilter?: MessageLevel | MessageLevel[]
): SystemMessage[] {
  const levels =
    levelFilter == null
      ? null
      : Array.isArray(levelFilter)
        ? new Set(levelFilter)
        : new Set([levelFilter]);
  if (!levels) return [...messages];
  return messages.filter((m) => levels.has(m.level));
}

function parseLogLine(line: string): SystemMessage | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const o = JSON.parse(trimmed) as Record<string, unknown>;
    if (
      !o ||
      typeof o.id !== "string" ||
      typeof o.level !== "string" ||
      typeof o.timestamp !== "string" ||
      typeof o.message !== "string"
    )
      return null;
    if (!["error", "warning", "info", "debug"].includes(o.level)) return null;
    return {
      id: o.id,
      level: o.level as MessageLevel,
      timestamp: o.timestamp,
      message: o.message,
      stack: typeof o.stack === "string" ? o.stack : undefined,
      context:
        o.context && typeof o.context === "object" && !Array.isArray(o.context)
          ? (o.context as Record<string, unknown>)
          : undefined,
      route: typeof o.route === "string" ? o.route : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Load older messages from the log file and merge into the store. Returns the batch and whether more exist.
 */
export async function getOlderMessages(
  olderThanId: string,
  levelFilter?: MessageLevel | MessageLevel[]
): Promise<{ messages: SystemMessage[]; hasMore: boolean }> {
  const batchSize = getLoadOlderBatchSize();
  const cutoffMsg = messages.find((m) => m.id === olderThanId);
  if (!cutoffMsg) return { messages: [], hasMore: false };
  const cutoffTime = cutoffMsg.timestamp;
  const levels =
    levelFilter == null
      ? null
      : Array.isArray(levelFilter)
        ? new Set(levelFilter)
        : new Set([levelFilter]);

  const filePath = getLogFilePath();
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return { messages: [], hasMore: false };
  }

  const lines = content.split("\n");
  const older: SystemMessage[] = [];
  for (const line of lines) {
    const msg = parseLogLine(line);
    if (!msg) continue;
    if (msg.timestamp >= cutoffTime) continue;
    if (levels && !levels.has(msg.level)) continue;
    older.push(msg);
    if (older.length >= batchSize) break;
  }

  const hasMore = older.length === batchSize;
  for (const m of older) {
    if (!messages.some((x) => x.id === m.id)) {
      messages.push(m);
    }
  }
  return { messages: older, hasMore };
}
