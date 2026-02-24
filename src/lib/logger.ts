/**
 * Structured logging for SPEC-0.0.1 Section 8.
 * Logs to stdout (JSON). In production can be sent to a log store.
 */

export type LogCategory =
  | "auth"
  | "author"
  | "student"
  | "system"
  | "sandbox";

export interface LogEntry {
  ts: string;
  category: LogCategory;
  event: string;
  userId?: string;
  [key: string]: unknown;
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify({
    ...entry,
    ts: entry.ts ?? new Date().toISOString(),
  });
}

export function log(entry: Omit<LogEntry, "ts">) {
  const full: LogEntry = {
    ...entry,
    ts: new Date().toISOString(),
  } as LogEntry;
  // eslint-disable-next-line no-console
  console.log(formatEntry(full));
}

export function logAuth(event: string, userId?: string, extra?: Record<string, unknown>) {
  log({ category: "auth", event, userId, ...extra });
}

export function logAuthor(
  event: string,
  userId: string,
  extra?: Record<string, unknown>
) {
  log({ category: "author", event, userId, ...extra });
}

export function logStudent(
  event: string,
  userId: string,
  extra?: Record<string, unknown>
) {
  log({ category: "student", event, userId, ...extra });
}

export function logSystem(event: string, extra?: Record<string, unknown>) {
  log({ category: "system", event, ...extra });
}

export function logSandbox(extra: Record<string, unknown>) {
  log({ category: "sandbox", event: "run", ...extra });
}
