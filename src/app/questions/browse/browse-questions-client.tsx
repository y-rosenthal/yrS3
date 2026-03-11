"use client";

import { useEffect, useState } from "react";
import type { QuestionListEntry } from "@/app/components/available-questions-table";
import { AvailableQuestionsTable } from "@/app/components/available-questions-table";
import { QuestionDetailPanel } from "@/app/components/question-detail-panel";
import { TagFilterBar } from "@/app/components/tag-filter-bar";

export function BrowseQuestionsClient() {
  const [questions, setQuestions] = useState<QuestionListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState("");
  const [appliedTags, setAppliedTags] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
      <TagFilterBar
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        appliedTags={appliedTags}
        onApply={applyTagFilter}
        onClear={clearTagFilter}
      />
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(32rem,1fr)_minmax(0,1fr)]">
          <AvailableQuestionsTable
            questions={questions}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
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
