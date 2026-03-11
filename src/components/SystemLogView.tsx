"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type MessageLevel = "error" | "warning" | "info" | "debug";

interface SystemMessage {
  id: string;
  level: MessageLevel;
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  route?: string;
}

const LEVEL_COLORS: Record<MessageLevel, string> = {
  error: "bg-red-100 border-red-300 text-red-900",
  warning: "bg-amber-100 border-amber-300 text-amber-900",
  info: "bg-blue-50 border-blue-200 text-blue-900",
  debug: "bg-zinc-100 border-zinc-300 text-zinc-600",
};

const LEVEL_LABELS: Record<MessageLevel, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
  debug: "Debug",
};

const DEFAULT_REFRESH_MS = 4000;

function getRefreshIntervalMs(): number {
  const v =
    typeof process.env.NEXT_PUBLIC_LOGS_REFRESH_INTERVAL_MS === "string"
      ? process.env.NEXT_PUBLIC_LOGS_REFRESH_INTERVAL_MS
      : "";
  if (v === "") return DEFAULT_REFRESH_MS;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REFRESH_MS;
}

export function SystemLogView() {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [levels, setLevels] = useState<Set<MessageLevel>>(
    new Set(["error", "warning", "info", "debug"])
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const levelParam = Array.from(levels).join(",");
  const buildUrl = useCallback(
    (olderThanId?: string) => {
      const params = new URLSearchParams();
      if (levelParam) params.set("level", levelParam);
      if (olderThanId) params.set("older_than_id", olderThanId);
      const q = params.toString();
      return `/api/logs${q ? `?${q}` : ""}`;
    },
    [levelParam]
  );

  const fetchLogs = useCallback(
    (olderThanId?: string) => {
      if (olderThanId) {
        setLoadingOlder(true);
      } else {
        setLoading(true);
      }
      fetch(buildUrl(olderThanId))
        .then((r) => r.json())
        .then((data: { messages: SystemMessage[]; hasMore?: boolean }) => {
          const list = data.messages ?? [];
          if (olderThanId) {
            setMessages((prev) => [...prev, ...list]);
            setHasMoreOlder(Boolean(data.hasMore));
          } else {
            setMessages(list);
            setHasMoreOlder(true);
          }
        })
        .catch(() => {
          if (!olderThanId) setMessages([]);
        })
        .finally(() => {
          setLoading(false);
          setLoadingOlder(false);
        });
    },
    [buildUrl]
  );

  useEffect(() => {
    fetchLogs();
    const intervalMs = getRefreshIntervalMs();
    const t = setInterval(() => fetchLogs(), intervalMs);
    return () => clearInterval(t);
  }, [levels, fetchLogs]);

  const toggleLevel = (level: MessageLevel) => {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900">System log</h1>
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Back
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded border border-zinc-200 bg-zinc-50 p-3">
        <span className="text-sm font-medium text-zinc-700">Filter by level:</span>
        {(["error", "warning", "info", "debug"] as const).map((level) => (
          <label key={level} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={levels.has(level)}
              onChange={() => toggleLevel(level)}
              className="rounded"
            />
            <span>{LEVEL_LABELS[level]}</span>
          </label>
        ))}
      </div>

      {loading && messages.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-zinc-500">No messages</p>
      ) : (
        <>
        <ul className="space-y-2">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={`rounded border p-3 ${LEVEL_COLORS[msg.level]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs text-zinc-500">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
                <span className="rounded px-2 py-0.5 text-xs font-medium">
                  {LEVEL_LABELS[msg.level]}
                </span>
              </div>
              <p className="mt-1 break-words font-medium">{msg.message}</p>
              {(msg.stack || msg.route || (msg.context && Object.keys(msg.context).length > 0)) && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((id) => (id === msg.id ? null : msg.id))
                    }
                    className="mt-2 text-xs font-medium underline hover:no-underline"
                  >
                    {expandedId === msg.id ? "Hide" : "Show"} details
                  </button>
                  {expandedId === msg.id && (
                    <pre className="mt-2 overflow-x-auto rounded bg-black/10 p-2 text-xs">
                      {msg.route && `Route: ${msg.route}\n`}
                      {msg.context &&
                        Object.keys(msg.context).length > 0 &&
                        `Context: ${JSON.stringify(msg.context, null, 2)}\n`}
                      {msg.stack && `Stack: ${msg.stack}`}
                    </pre>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        {messages.length > 0 && hasMoreOlder && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const oldest = messages[messages.length - 1];
                if (oldest) fetchLogs(oldest.id);
              }}
              disabled={loadingOlder}
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
