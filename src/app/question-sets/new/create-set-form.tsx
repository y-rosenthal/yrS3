"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { QuestionListEntry } from "@/app/components/available-questions-table";
import { AvailableQuestionsTable } from "@/app/components/available-questions-table";
import { QuestionDetailPanel } from "@/app/components/question-detail-panel";
import { SelectedQuestionCard } from "@/app/components/selected-question-card";
import { TagFilterBar } from "@/app/components/tag-filter-bar";

const TAB_INCLUDE = "include";
const TAB_SELECTED = "selected";
type TabId = typeof TAB_INCLUDE | typeof TAB_SELECTED;

export function CreateSetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questions, setQuestions] = useState<QuestionListEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>(TAB_INCLUDE);
  const [frontMatterCollapsed, setFrontMatterCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [chosenTags, setChosenTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [selectedCompact, setSelectedCompact] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const selectedListRef = useRef<HTMLDivElement>(null);

  async function loadQuestions(tags?: string[], q?: string) {
    const filter = tags ?? chosenTags;
    const search = q ?? searchQuery;
    const params = new URLSearchParams();
    if (filter.length) params.set("tags", filter.join(","));
    if (search.trim()) params.set("q", search.trim());
    const url = `/api/questions${params.toString() ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (chosenTags.length) params.set("tags", chosenTags.join(","));
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        const url = `/api/questions${params.toString() ? `?${params}` : ""}`;
        const res = await fetch(url);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setQuestions(Array.isArray(data) ? data : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [chosenTags.join(","), searchQuery]);

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
      const setImported = data.questionSetImported ?? 0;
      const setUpdated = data.questionSetUpdated ?? 0;
      const errors = Array.isArray(data.errors) ? data.errors : [];
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (chosenTags.length) params.set("tags", chosenTags.join(","));
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        const url = `/api/questions${params.toString() ? `?${params}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setQuestions(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
      const parts: string[] = [];
      if (imported > 0) parts.push(`${imported} question version(s)`);
      if (setImported > 0) parts.push(`${setImported} question set(s) imported`);
      if (setUpdated > 0) parts.push(`${setUpdated} question set(s) updated`);
      if (parts.length > 0) {
        setSyncMessage(`Sync: ${parts.join("; ")}.`);
      } else if (errors.length > 0) {
        setSyncMessage(errors.slice(0, 3).join("; ") + (errors.length > 3 ? "…" : ""));
      } else {
        setSyncMessage("Sync completed. Nothing new (folders may be empty or already in sync).");
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

  function moveQuestion(fromIndex: number, direction: "up" | "down") {
    setSelectedIds((prev) => {
      const next = [...prev];
      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= next.length) return prev;
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }

  function getOrdinalInSet(questionId: string): number {
    const idx = selectedIds.indexOf(questionId);
    return idx === -1 ? 0 : idx + 1;
  }

  function setOrdinalInSet(questionId: string, newOrdinal: number) {
    const n = Math.max(1, Math.min(newOrdinal, selectedIds.length));
    setSelectedIds((prev) => {
      const idx = prev.indexOf(questionId);
      if (idx === -1) return prev;
      const next = prev.filter((x) => x !== questionId);
      next.splice(n - 1, 0, questionId);
      return next;
    });
  }

  function jumpToSelectedQuestion(questionId: string) {
    setActiveTab(TAB_SELECTED);
    requestAnimationFrame(() => {
      const el = document.getElementById(`selected-q-${questionId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const detailQuestion =
    detailIndex != null && questions[detailIndex] != null
      ? questions[detailIndex]
      : null;

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
        instructions: instructions.trim() || undefined,
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
    router.push(`/question-sets/${encodeURIComponent(set.id)}/edit`);
  }

  if (loading) {
    return (
      <div className="text-zinc-600">Loading questions…</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Front matter: compact, collapsible */}
      <div className="rounded border border-zinc-200 bg-zinc-50/50">
        <button
          type="button"
          onClick={() => setFrontMatterCollapsed((c) => !c)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100/80"
          aria-expanded={!frontMatterCollapsed}
        >
          <span>Title, description &amp; instructions</span>
          <span className="text-zinc-500" aria-hidden>
            {frontMatterCollapsed ? "Show" : "Hide"}
          </span>
        </button>
        {!frontMatterCollapsed && (
          <div className="space-y-3 border-t border-zinc-200 px-3 py-3">
            <div>
              <label htmlFor="title" className="block text-xs font-medium text-zinc-600">
                Title <span className="text-red-600">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800"
                placeholder="e.g. Bash basics, Week 3 homework"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-xs font-medium text-zinc-600">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={1}
                className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800"
                placeholder="Short description of this set"
              />
            </div>
            <div>
              <label htmlFor="instructions" className="block text-xs font-medium text-zinc-600">
                Instructions (optional)
              </label>
              <textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800"
                placeholder="Instructions shown to the user when taking this set"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabbed: Questions to include | Selected questions */}
      <div>
        <div
          role="tablist"
          aria-label="Questions to include and selected questions"
          className="flex gap-1 border-b border-zinc-200"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_INCLUDE}
            aria-controls="panel-include"
            id="tab-include"
            onClick={() => setActiveTab(TAB_INCLUDE)}
            className="rounded-t px-4 py-2 text-sm font-medium transition-colors aria-selected:border-b-2 aria-selected:border-zinc-800 aria-selected:bg-white aria-selected:text-zinc-900 aria-not-selected:text-zinc-600 hover:text-zinc-800"
          >
            Questions to include
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_SELECTED}
            aria-controls="panel-selected"
            id="tab-selected"
            onClick={() => setActiveTab(TAB_SELECTED)}
            className="rounded-t px-4 py-2 text-sm font-medium transition-colors aria-selected:border-b-2 aria-selected:border-zinc-800 aria-selected:bg-white aria-selected:text-zinc-900 aria-not-selected:text-zinc-600 hover:text-zinc-800"
          >
            Selected questions for this set ({selectedIds.length})
          </button>
        </div>

        {/* Panel: Questions to include */}
        <div
          id="panel-include"
          role="tabpanel"
          aria-labelledby="tab-include"
          hidden={activeTab !== TAB_INCLUDE}
          className="pt-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create question set"}
              </button>
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(true)}
                className="rounded border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </button>
              {!submitting && !title.trim() && (
                <span className="text-sm text-zinc-500">
                  {"Enter a title in \"Title, description & instructions\" above to enable Create."}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TagFilterBar
              chosenTags={chosenTags}
              onChosenTagsChange={setChosenTags}
              label="Filter by tags:"
              placeholder="Add tags…"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="create-set-search" className="text-sm font-medium text-zinc-700">
                Full text search:
              </label>
              <input
                id="create-set-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, question text…"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800 w-52"
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">
              {"Click \"Add to set\" to add a question. Use the \"Selected questions\" tab to review, reorder, and remove."}
            </p>
            {questions.length > 0 && (
              <button
                type="button"
                onClick={() => loadQuestions(chosenTags, searchQuery)}
                className="text-sm text-zinc-600 hover:text-zinc-800 underline"
              >
                Refresh list
              </button>
            )}
          </div>
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
                {syncLoading ? "Syncing…" : "Sync from folders (questions + question sets)"}
              </button>
              {syncMessage && (
                <p className={`text-sm ${syncMessage.startsWith("Sync:") || syncMessage.startsWith("Sync completed.") ? "text-green-700" : "text-amber-700"}`}>
                  {syncMessage}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(32rem,1fr)_minmax(0,1fr)]">
              <AvailableQuestionsTable
                questions={questions}
                selectedIndex={detailIndex}
                onSelectIndex={setDetailIndex}
                onClearSelection={() => setDetailIndex(null)}
                highlightQuestionIds={selectedIds}
                ariaLabel="Questions to include"
                showIdInList={false}
                actionColumn={(q) => {
                  const inSet = selectedIds.includes(q.id);
                  const ord = getOrdinalInSet(q.id);
                  return (
                    <div className="flex items-center gap-1">
                      {inSet ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToSelectedQuestion(q.id);
                            }}
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                            aria-label={`Go to position ${ord} in selected list`}
                            title="Go to this question in Selected questions tab"
                          >
                            Go to #{ord}
                          </button>
                          <label className="sr-only" htmlFor={`ord-include-${q.id}`}>
                            Position in set (edit to reorder)
                          </label>
                          <input
                            id={`ord-include-${q.id}`}
                            type="number"
                            min={1}
                            max={selectedIds.length}
                            value={ord}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!Number.isNaN(v)) setOrdinalInSet(q.id, v);
                            }}
                            className="w-12 rounded border border-zinc-300 px-1 py-0.5 text-center text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToSet(q.id);
                          }}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                          aria-label={`Add question ${q.id} to set`}
                        >
                          Add to set
                        </button>
                      )}
                    </div>
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
        </div>

        {/* Panel: Selected questions for this set */}
        <div
          id="panel-selected"
          role="tabpanel"
          aria-labelledby="tab-selected"
          hidden={activeTab !== TAB_SELECTED}
          ref={selectedListRef}
          className="pt-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create question set"}
              </button>
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(true)}
                className="rounded border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </button>
              {!submitting && !title.trim() && (
                <span className="text-sm text-zinc-500">
                  {"Enter a title in \"Title, description & instructions\" above to enable Create."}
                </span>
              )}
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={selectedCompact}
                  onChange={(e) => setSelectedCompact(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Compact layout
              </label>
            </div>
          </div>
          {selectedIds.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No questions selected yet. Use the &quot;Questions to include&quot; tab to add questions. Order here is the order they will appear when taking the set.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-zinc-500">
                Order below is the order when taking the set. Edit the position number or use the arrows to reorder.
              </p>
              <ul className="flex flex-col gap-6" aria-label="Selected questions">
                {selectedIds.map((id, index) => {
                  const meta = questions.find((q) => q.id === id);
                  const version = meta?.version ?? "";
                  const ord = index + 1;
                  return (
                    <li key={id} id={`selected-q-${id}`} className="flex items-start gap-2">
                      <div className="flex shrink-0 flex-col items-center gap-0.5 pt-2">
                        <label className="text-xs text-zinc-500" htmlFor={`ord-selected-${id}`}>
                          Position
                        </label>
                        <input
                          id={`ord-selected-${id}`}
                          type="number"
                          min={1}
                          max={selectedIds.length}
                          value={ord}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isNaN(v)) setOrdinalInSet(id, v);
                          }}
                          className="w-12 rounded border border-zinc-300 px-1 py-0.5 text-center text-sm"
                          aria-label={`Position in set (edit to reorder)`}
                        />
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, "up")}
                          disabled={index === 0}
                          className="rounded border border-zinc-300 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Move up`}
                          title="Move up"
                        >
                          <span className="inline-block size-4 text-center leading-4">↑</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, "down")}
                          disabled={index === selectedIds.length - 1}
                          className="rounded border border-zinc-300 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Move down`}
                          title="Move down"
                        >
                          <span className="inline-block size-4 text-center leading-4">↓</span>
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <SelectedQuestionCard
                          questionId={id}
                          version={version}
                          onRemove={() => removeFromSet(id)}
                          compact={selectedCompact}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
          <div className="mx-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-lg max-w-md">
            <h2 id="cancel-dialog-title" className="text-lg font-semibold text-zinc-900">
              Cancel creating question set?
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Your question set will not be saved. Are you sure you want to leave?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                className="rounded border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
              >
                Stay
              </button>
              <Link
                href="/question-sets"
                className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                onClick={() => setCancelConfirmOpen(false)}
              >
                Leave
              </Link>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
