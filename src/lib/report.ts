/**
 * Central reporting: log file + in-memory system-message store (SPEC 0.0.5).
 * Best-effort: file write failure does not throw; message still goes to store.
 */

import fs from "fs/promises";
import path from "path";
import { getLogFilePath } from "./log-file-path";
import { addSystemMessage } from "./system-messages";
import { logSystem } from "./logger";

export type ReportLevel = "error" | "warning" | "info" | "debug";

async function appendLogLine(line: string): Promise<void> {
  try {
    const filePath = getLogFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, line + "\n", "utf-8");
  } catch {
    // Best-effort; do not throw
  }
}

function buildPayload(
  id: string,
  level: ReportLevel,
  message: string,
  timestamp: string,
  stack?: string,
  context?: Record<string, unknown>,
  route?: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id,
    level,
    timestamp,
    message,
  };
  if (stack) payload.stack = stack;
  if (context && Object.keys(context).length > 0) payload.context = context;
  if (route) payload.route = route;
  return payload;
}

/**
 * Report a system message: write to log file and add to in-memory store.
 * Optionally logs to stdout via existing logger.
 */
export function report(
  level: ReportLevel,
  messageOrError: string | Error,
  context?: Record<string, unknown>
): void {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const message =
    typeof messageOrError === "string" ? messageOrError : messageOrError.message;
  const stack = typeof messageOrError === "string" ? undefined : messageOrError.stack;
  const route = context?.route as string | undefined;

  const payload = buildPayload(id, level, message, timestamp, stack, context, route);
  const line = JSON.stringify(payload);
  appendLogLine(line).catch(() => {});

  addSystemMessage({
    id,
    timestamp,
    level,
    message,
    stack,
    context,
    route,
  });

  logSystem(`report_${level}`, { message, ...context });
}

export function reportError(
  messageOrError: string | Error,
  context?: Record<string, unknown>
): void {
  report("error", messageOrError, context);
}

export function reportWarning(
  message: string,
  context?: Record<string, unknown>
): void {
  report("warning", message, context);
}

export function reportInfo(
  message: string,
  context?: Record<string, unknown>
): void {
  report("info", message, context);
}

export function reportDebug(
  message: string,
  context?: Record<string, unknown>
): void {
  report("debug", message, context);
}
