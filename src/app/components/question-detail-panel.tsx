"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ParsedQuestion } from "@/lib/questions/types";

type Props = {
  questionId: string | null;
  version?: string;
};

export function QuestionDetailPanel({ questionId, version }: Props) {
  const [question, setQuestion] = useState<ParsedQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!questionId) {
      setQuestion(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const url = `/api/questions/${encodeURIComponent(questionId)}${version ? `?version=${encodeURIComponent(version)}` : ""}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load question");
        return res.json();
      })
      .then((data) => {
        setQuestion(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load question");
        setQuestion(null);
      })
      .finally(() => setLoading(false));
  }, [questionId, version]);

  if (!questionId) {
    return (
      <div className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white p-6 text-center text-zinc-500">
        Select a question to view details.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white p-6 text-zinc-600">
        Loading…
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white p-6 text-red-600">
        {error ?? "Question not found."}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
                  className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700"
                >
                  {t}
                </span>
              ))}
            </span>
          </>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-700">Question</h3>
        <div className="prose prose-sm w-full max-w-none overflow-y-auto rounded border border-zinc-100 bg-zinc-50/50 p-4 text-zinc-800">
          {question.promptFormat === "md" ? (
            <ReactMarkdown>{question.prompt}</ReactMarkdown>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {question.prompt}
            </pre>
          )}
        </div>
      </div>

      {question.type === "multiple_choice" && question.options && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-700">Options</h3>
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

      {question.type === "bash" && question.solutionScript && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-700">
            Solution script
          </h3>
          <pre className="max-h-48 overflow-auto rounded border border-zinc-200 bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
            {question.solutionScript}
          </pre>
        </div>
      )}

      {question.type === "bash_predict_output" && (
        <>
          {question.scriptSource && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-700">Script</h3>
              <pre className="max-h-32 overflow-auto rounded border border-zinc-200 bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
                {question.scriptSource}
              </pre>
            </div>
          )}
          {question.expected && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-700">
                Expected output
              </h3>
              <pre className="rounded border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm text-zinc-800">
                {typeof question.expected.answer === "string"
                  ? question.expected.answer
                  : JSON.stringify(question.expected)}
              </pre>
            </div>
          )}
        </>
      )}

      {question.tests && question.tests.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-700">Tests</h3>
          <p className="text-sm text-zinc-600">
            {question.tests.length} test case(s) defined.
          </p>
        </div>
      )}
    </div>
  );
}
