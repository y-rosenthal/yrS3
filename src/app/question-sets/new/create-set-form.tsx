"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface QuestionOption {
  id: string;
  type: string;
  version: string;
  title?: string;
  domain?: string;
}

export function CreateSetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  async function loadQuestions() {
    const res = await fetch("/api/questions");
    if (res.ok) {
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    (async () => {
      await loadQuestions();
      setLoading(false);
    })();
  }, []);

  async function handleSyncFromFolder() {
    setSyncMessage("");
    setSyncLoading(true);
    try {
      const res = await fetch("/api/admin/sync-questions", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMessage(data.error ?? "Sync failed");
        return;
      }
      const imported = data.imported ?? 0;
      const errors = Array.isArray(data.errors) ? data.errors : [];
      await loadQuestions();
      if (imported > 0) {
        setSyncMessage(`Synced ${imported} question(s) from the questions/ folder.`);
      } else if (errors.length > 0) {
        setSyncMessage(errors.slice(0, 3).join("; ") + (errors.length > 3 ? "…" : ""));
      } else {
        setSyncMessage("Sync completed. No new questions imported (folder may be empty or already in sync).");
      }
    } catch (e) {
      setSyncMessage(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncLoading(false);
    }
  }

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    const questionLogicalIds = [
      ...new Set(questions.filter((q) => selectedIds.has(q.id)).map((q) => q.id)),
    ];
    const res = await fetch("/api/question-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        questionLogicalIds,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create question set");
      setSubmitting(false);
      return;
    }
    const set = await res.json();
    router.push(`/question-sets`);
  }

  if (loading) {
    return (
      <div className="text-zinc-600">Loading questions…</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700">
          Title <span className="text-red-600">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-zinc-800"
          placeholder="e.g. Bash basics, Week 3 homework"
          required
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-zinc-800"
          placeholder="Short description of this set"
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <label className="block text-sm font-medium text-zinc-700">
            Questions to include
          </label>
          {questions.length > 0 && (
            <button
              type="button"
              onClick={() => loadQuestions()}
              className="text-sm text-zinc-600 hover:text-zinc-800 underline"
            >
              Refresh list
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Select the questions to add to this set. Order is the order they will appear when taking as a test.
        </p>
        {questions.length === 0 ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-zinc-500">No questions available. Create or upload questions first.</p>
            <p className="text-sm text-zinc-500">
              If you have question files in the <code className="rounded bg-zinc-100 px-1">questions/</code> folder,
              sync them into the database first (requires login).
            </p>
            <button
              type="button"
              onClick={handleSyncFromFolder}
              disabled={syncLoading}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {syncLoading ? "Syncing…" : "Sync questions from folder"}
            </button>
            {syncMessage && (
              <p className={`text-sm ${syncMessage.startsWith("Synced") ? "text-green-700" : "text-amber-700"}`}>
                {syncMessage}
              </p>
            )}
          </div>
        ) : (
          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded border border-zinc-200 bg-white p-2">
            {questions.map((q) => (
              <li key={q.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                    className="rounded border-zinc-300"
                  />
                  <span className="font-mono text-sm text-zinc-800">{q.id}</span>
                  {q.title && (
                    <span className="text-sm text-zinc-600">— {q.title}</span>
                  )}
                  <span className="text-xs text-zinc-400">{q.type}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create question set"}
        </button>
        <Link
          href="/question-sets"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
