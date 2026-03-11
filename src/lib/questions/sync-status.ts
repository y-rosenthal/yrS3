/**
 * In-memory store for the last startup or manual sync result (SPEC 0.0.5).
 * Holds only the most recent outcome; no history.
 */

export type SyncStatusState =
  | { status: "ran"; errors?: string[]; imported?: number; conflictsResolved?: number; lastUpdatedAt?: string }
  | { status: "skipped"; reason?: string; lastUpdatedAt?: string };

let syncStatus: SyncStatusState = {
  status: "ran",
  imported: 0,
  conflictsResolved: 0,
  errors: [],
};

export function getSyncStatus(): SyncStatusState {
  return { ...syncStatus };
}

export function setSyncStatusRan(payload: {
  imported: number;
  conflictsResolved: number;
  errors: string[];
}): void {
  syncStatus = {
    status: "ran",
    imported: payload.imported,
    conflictsResolved: payload.conflictsResolved,
    errors: payload.errors,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function setSyncStatusSkipped(reason: string): void {
  syncStatus = {
    status: "skipped",
    reason,
    lastUpdatedAt: new Date().toISOString(),
  };
}
