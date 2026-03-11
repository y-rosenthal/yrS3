"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">Title</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">Domain</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 font-mono text-sm text-zinc-800">{q.id}</td>
                  <td className="px-4 py-2 text-sm text-zinc-700">{q.title ?? "—"}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600">{q.type}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600">{q.domain ?? "—"}</td>
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
                      <span className="text-zinc-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
