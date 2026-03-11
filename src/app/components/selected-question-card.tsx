"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ParsedQuestion } from "@/lib/questions/types";

type Props = {
  questionId: string;
  version: string;
  onRemove: () => void;
};

export function SelectedQuestionCard({ questionId, version, onRemove }: Props) {
  const [question, setQuestion] = useState<ParsedQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = `/api/questions/${encodeURIComponent(questionId)}?version=${encodeURIComponent(version)}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load question");
        return res.json();
      })
      .then(setQuestion)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setQuestion(null);
      })
      .finally(() => setLoading(false));
  }, [questionId, version]);

  if (loading) {
    return (
      <article className="rounded-lg border-2 border-zinc-200 bg-zinc-50/50 p-4">
        <p className="text-sm text-zinc-500">Loading question…</p>
      </article>
    );
  }

  if (error || !question) {
    return (
      <article className="rounded-lg border-2 border-zinc-200 bg-zinc-50/50 p-4">
        <p className="text-sm text-red-600">{error ?? "Question not found."}</p>
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 text-sm text-zinc-600 underline hover:text-zinc-800"
        >
          Remove from set
        </button>
      </article>
    );
  }

  return (
    <article className="rounded-lg border-2 border-zinc-300 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-200 bg-zinc-50/80 px-4 py-3">
        <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-500">ID</span>
          <span className="font-mono text-zinc-800">{question.id}</span>
          <span className="text-zinc-500">Type</span>
          <span className="text-zinc-800">{question.type}</span>
          <span className="text-zinc-500">Version</span>
          <span className="text-zinc-800">{question.version}</span>
          {question.title != null && (
            <>
              <span className="text-zinc-500">Title</span>
              <span className="text-zinc-800">{question.title}</span>
            </>
          )}
          {question.domain != null && question.domain !== "" && (
            <>
              <span className="text-zinc-500">Domain</span>
              <span className="text-zinc-800">{question.domain}</span>
            </>
          )}
          {question.tags != null && question.tags.length > 0 && (
            <>
              <span className="text-zinc-500">Tags</span>
              <span className="flex flex-wrap gap-1">
                {question.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-700"
                  >
                    {t}
                  </span>
                ))}
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          aria-label={`Remove question ${question.id} from set`}
        >
          Remove from set
        </button>
      </div>
      <div className="p-4">
        <h4 className="mb-2 border-b border-zinc-300 pb-1.5 text-sm font-semibold uppercase tracking-wide text-zinc-600">
          Question
        </h4>
        <div className="prose prose-sm max-w-none rounded border border-zinc-100 bg-zinc-50/50 p-4 text-zinc-800">
          {question.promptFormat === "md" ? (
            <ReactMarkdown>{question.prompt}</ReactMarkdown>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {question.prompt}
            </pre>
          )}
        </div>
        {question.type === "multiple_choice" && question.options && (
          <div className="mt-3">
            <h4 className="mb-1.5 text-sm font-medium text-zinc-600">
              Options
            </h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-800">
              {question.options.map((opt) => (
                <li key={opt.id}>
                  <span className="font-mono text-zinc-600">{opt.id}:</span>{" "}
                  {opt.text}
                  {question.correctId === opt.id && (
                    <span className="ml-1 text-green-600">(correct)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
