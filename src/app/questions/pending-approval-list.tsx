"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface PendingVersionRow {
  id: string;
  logical_id: string;
  version: string;
  type: string;
  title: string | null;
  domain: string | null;
  proposed_by: string | null;
  created_at: string;
}

export function PendingApprovalList({ pending }: { pending: PendingVersionRow[] }) {
  const router = useRouter();
  const [approving, setApproving] = useState<string | null>(null);

  async function handleApprove(logicalId: string, version: string) {
    const key = `${logicalId}/${version}`;
    setApproving(key);
    try {
      const res = await fetch(
        `/api/questions/${encodeURIComponent(logicalId)}/versions/${encodeURIComponent(version)}/approve`,
        { method: "POST" }
      );
      if (res.ok) router.refresh();
    } finally {
      setApproving(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-medium text-zinc-800">Pending your approval</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Others have proposed new versions of your questions. Approve to make them official.
      </p>
      <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {pending.map((q) => {
          const key = `${q.logical_id}/${q.version}`;
          const busy = approving === key;
          return (
            <li key={key} className="px-4 py-3 flex justify-between items-center">
              <div>
                <span className="font-mono text-zinc-800">{q.logical_id}</span>
                <span className="ml-2 text-sm text-zinc-500">
                  v{q.version} · {q.type}
                  {q.title && ` · ${q.title}`}
                </span>
                {q.domain && (
                  <div className="mt-1 text-sm text-zinc-500">Domain: {q.domain}</div>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleApprove(q.logical_id, q.version)}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Approving…" : "Approve"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
