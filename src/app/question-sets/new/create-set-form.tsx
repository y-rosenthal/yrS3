"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { QuestionListEntry } from "@/app/components/available-questions-table";
import { AvailableQuestionsTable } from "@/app/components/available-questions-table";
import { QuestionDetailPanel } from "@/app/components/question-detail-panel";
import { SelectedQuestionCard } from "@/app/components/selected-question-card";
import { TagFilterBar } from "@/app/components/tag-filter-bar";

export function CreateSetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionListEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [appliedTagFilter, setAppliedTagFilter] = useState<string[]>([]);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  async function loadQuestions(tags?: string[]) {
    const filter = tags ?? appliedTagFilter;
    const url =
      filter.length > 0
        ? `/api/questions?tags=${encodeURIComponent(filter.join(","))}`
        : "/api/questions";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    (async () => {
      await loadQuestions([]);
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

  function addToSet(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function removeFromSet(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  const detailQuestion =
    detailIndex != null && questions[detailIndex] != null
      ? questions[detailIndex]
      : null;

  function applyTagFilter() {
    const tags = tagFilter
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setAppliedTagFilter(tags);
    loadQuestions(tags);
  }

  function clearTagFilter() {
    setTagFilter("");
    setAppliedTagFilter([]);
    loadQuestions([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    const questionLogicalIds = selectedIds;
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
          Click &quot;Add to set&quot; to add a question to your set. Use the selected list below to review and remove. Order in that list is the order questions will appear when taking the test.
        </p>
        <div className="mt-2">
          <TagFilterBar
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            appliedTags={appliedTagFilter}
            onApply={applyTagFilter}
            onClear={clearTagFilter}
            label="Filter by tags:"
            inputPlaceholder="e.g. bash, intro"
            clearLabel="Clear"
          />
        </div>
        {appliedTagFilter.length > 0 && (
          <p className="text-sm text-zinc-500">
            Showing questions with all tags: {appliedTagFilter.join(", ")}
          </p>
        )}
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
          <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <AvailableQuestionsTable
              questions={questions}
              selectedIndex={detailIndex}
              onSelectIndex={setDetailIndex}
              ariaLabel="Questions to include"
              actionColumn={(q) => {
                const inSet = selectedIds.includes(q.id);
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!inSet) addToSet(q.id);
                    }}
                    disabled={inSet}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-default disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-500"
                    aria-label={inSet ? "Already in set" : `Add question ${q.id} to set`}
                  >
                    {inSet ? "In set" : "Add to set"}
                  </button>
                );
              }}
            />
            <div className="min-h-[200px] min-w-0">
              <QuestionDetailPanel
                questionId={detailQuestion?.id ?? null}
                version={detailQuestion?.version}
              />
            </div>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-medium text-zinc-800">
              Selected questions for this set
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              All questions below will appear in the set in this order. Remove any you do not want.
            </p>
            <ul className="mt-4 flex flex-col gap-6" aria-label="Selected questions">
              {selectedIds.map((id) => {
                const meta = questions.find((q) => q.id === id);
                const version = meta?.version ?? "";
                return (
                  <li key={id}>
                    <SelectedQuestionCard
                      questionId={id}
                      version={version}
                      onRemove={() => removeFromSet(id)}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
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
