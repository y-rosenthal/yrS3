"use client";

import { useEffect, useState } from "react";

interface SyncStatus {
  status: "ran" | "skipped";
  reason?: string;
  errors?: string[];
  imported?: number;
  conflictsResolved?: number;
  lastUpdatedAt?: string;
}

const REMEDIATION =
  "Default question owner not found. To fix: (1) Local: run `supabase db reset` to create the seed user, or (2) Set QUESTION_SYNC_OWNER_ID to a valid user UUID. Ensure SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY) is set for startup sync. See SETUP/SPEC-DB-FS-QUESTION-SYNC.";

export function SyncStatusBanner() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/sync-status")
      .then((r) => r.json())
      .then(setSyncStatus)
      .catch(() => setSyncStatus(null));
  }, []);

  if (!syncStatus || dismissed) return null;

  const showBanner =
    syncStatus.status === "skipped" ||
    (syncStatus.status === "ran" &&
      Array.isArray(syncStatus.errors) &&
      syncStatus.errors.length > 0);

  if (!showBanner) return null;

  const isSkipped = syncStatus.status === "skipped";
  const hasErrors =
    Array.isArray(syncStatus.errors) && syncStatus.errors.length > 0;

  return (
    <div
      role="alert"
      className="border-b bg-amber-50 text-amber-900 border-amber-200 px-4 py-3"
    >
      <div className="mx-auto max-w-4xl flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {isSkipped
              ? "FS question sync did not run"
              : "Question sync completed with errors"}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {isSkipped
              ? syncStatus.reason ?? REMEDIATION
              : "Some FS-only versions could not be imported. Check the details below."}
          </p>
          {hasErrors && !isSkipped && (
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="mt-2 text-sm font-medium text-amber-800 underline hover:no-underline"
            >
              {detailsOpen ? "Hide" : "Show"} error details
            </button>
          )}
          {detailsOpen && hasErrors && syncStatus.errors && (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
              {syncStatus.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
          {isSkipped && (
            <p className="mt-2 text-sm text-amber-700">{REMEDIATION}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded px-2 py-1 text-sm text-amber-800 hover:bg-amber-100"
          aria-label="Dismiss banner"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
