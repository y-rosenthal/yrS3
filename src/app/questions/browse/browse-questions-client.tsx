"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { QuestionDetailPanel } from "@/app/components/question-detail-panel";

interface QuestionItem {
  id: string;
  type: string;
  version: string;
  title?: string;
  domain?: string;
  tags: string[];
}

export function BrowseQuestionsClient() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState("");
  const [appliedTags, setAppliedTags] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  function loadQuestions(tags?: string[]) {
    setLoading(true);
    const url = tags?.length
      ? `/api/questions?tags=${encodeURIComponent(tags.join(","))}`
      : "/api/questions";
    fetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadQuestions(appliedTags.length ? appliedTags : undefined);
  }, [appliedTags.join(",")]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [appliedTags.join(",")]);

  const selectedQuestion =
    selectedIndex != null && questions[selectedIndex] != null
      ? questions[selectedIndex]
      : null;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (questions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, questions.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === null ? questions.length - 1 : Math.max(0, prev - 1)
        );
      }
    },
    [questions.length]
  );

  useEffect(() => {
    if (selectedIndex == null) return;
    rowRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedIndex]);

  function applyTagFilter() {
    const tags = tagFilter
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setAppliedTags(tags);
  }

  function clearTagFilter() {
    setTagFilter("");
    setAppliedTags([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="tag-filter" className="text-sm font-medium text-zinc-700">
          Filter by tags (comma-separated):
        </label>
        <input
          id="tag-filter"
          type="text"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyTagFilter())}
          placeholder="e.g. bash, intro"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800 w-48"
        />
        <button
          type="button"
          onClick={applyTagFilter}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Apply
        </button>
        {appliedTags.length > 0 && (
          <button
            type="button"
            onClick={clearTagFilter}
            className="text-sm text-zinc-500 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      {appliedTags.length > 0 && (
        <p className="text-sm text-zinc-500">
          Showing questions with all tags: {appliedTags.join(", ")}
        </p>
      )}
      {loading ? (
        <p className="text-zinc-600">Loading questions…</p>
      ) : questions.length === 0 ? (
        <p className="text-zinc-500">No questions found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div
            ref={tableWrapperRef}
            tabIndex={0}
            role="grid"
            aria-label="Questions list"
            onKeyDown={handleKeyDown}
            className="min-w-0 overflow-x-auto rounded-lg border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-zinc-300"
          >
            <table className="min-w-full divide-y divide-zinc-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
                    ID
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
                    Title
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
                    Domain
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {questions.map((q, idx) => (
                  <tr
                    key={q.id}
                    ref={(el) => {
                      rowRefs.current[idx] = el;
                    }}
                    role="row"
                    aria-selected={selectedIndex === idx}
                    tabIndex={-1}
                    onClick={() => setSelectedIndex(idx)}
                    className={`cursor-pointer hover:bg-zinc-50 ${
                      selectedIndex === idx ? "bg-zinc-100" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-mono text-sm text-zinc-800">
                      {q.id}
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700">
                      {q.title ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-600">{q.type}</td>
                    <td className="px-4 py-2 text-sm text-zinc-600">
                      {q.domain ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      {q.tags?.length ? (
                        <span className="flex flex-wrap gap-1">
                          {q.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700"
                            >
                              {t}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="min-h-[200px] min-w-0 lg:sticky lg:top-4">
            <QuestionDetailPanel
              questionId={selectedQuestion?.id ?? null}
              version={selectedQuestion?.version}
            />
          </div>
        </div>
      )}
    </div>
  );
}
