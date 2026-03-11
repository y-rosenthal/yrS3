"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-red-700">Something went wrong</h2>
      <p className="text-sm text-zinc-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-zinc-200 px-4 py-2 text-sm hover:bg-zinc-300"
      >
        Try again
      </button>
    </div>
  );
}
