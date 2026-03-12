"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuestionListEntry } from "@/app/components/available-questions-table";
import { AvailableQuestionsTable } from "@/app/components/available-questions-table";
import { QuestionDetailPanel } from "@/app/components/question-detail-panel";
import { TagFilterBar } from "@/app/components/tag-filter-bar";

export function BrowseQuestionsClient() {
  const [questions, setQuestions] = useState<QuestionListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chosenTags, setChosenTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const loadQuestions = useCallback(
    (tags: string[], q: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (tags.length) params.set("tags", tags.join(","));
      if (q.trim()) params.set("q", q.trim());
      const url = `/api/questions${params.toString() ? `?${params}` : ""}`;
      fetch(url)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setQuestions(Array.isArray(data) ? data : []))
        .catch(() => setQuestions([]))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    loadQuestions(chosenTags, searchQuery);
  }, [chosenTags, searchQuery, loadQuestions]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [chosenTags.join(","), searchQuery]);

  const selectedQuestion =
    selectedIndex != null && questions[selectedIndex] != null
      ? questions[selectedIndex]
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <TagFilterBar
          chosenTags={chosenTags}
          onChosenTagsChange={setChosenTags}
          label="Filter by tags:"
          placeholder="Add tags…"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="question-search" className="text-sm font-medium text-zinc-700">
            Full text search:
          </label>
          <input
            id="question-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, domain, question text…"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800 w-56"
          />
        </div>
      </div>
      {(chosenTags.length > 0 || searchQuery.trim()) && (
        <p className="text-sm text-zinc-500">
          {chosenTags.length > 0 && `Tags: ${chosenTags.join(", ")}`}
          {chosenTags.length > 0 && searchQuery.trim() && " · "}
          {searchQuery.trim() && `Search: "${searchQuery.trim()}"`}
        </p>
      )}
      {loading ? (
        <p className="text-zinc-600">Loading questions…</p>
      ) : questions.length === 0 ? (
        <p className="text-zinc-500">No questions found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(32rem,1fr)_minmax(0,1fr)]">
          <AvailableQuestionsTable
            questions={questions}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            onClearSelection={() => setSelectedIndex(null)}
            ariaLabel="Questions list"
          />
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
