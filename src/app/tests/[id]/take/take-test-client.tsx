"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { TestDef } from "@/lib/tests-config";
import type { ParsedQuestion } from "@/lib/questions/types";
import Link from "next/link";

type Props = { test: TestDef };

export function TakeTestClient({ test }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    totalScore: number;
    maxScore: number;
    results: Array<{ questionId: string; feedback: string; passed: boolean }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const startRes = await fetch(`/api/tests/${test.id}/start`, {
        method: "POST",
      });
      if (!startRes.ok) {
        setError("Failed to start test");
        setLoading(false);
        return;
      }
      const startData = await startRes.json();
      setSessionId(startData.sessionId);
      const ids = startData.questionIds ?? test.questionIds ?? [];
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      const loaded: ParsedQuestion[] = [];
      for (const id of ids) {
        const qRes = await fetch(`/api/questions/${id}`);
        if (qRes.ok) {
          const q = await qRes.json();
          loaded.push(q);
        }
      }
      setQuestions(loaded);
      setLoading(false);
    })();
  }, [test.id, test.questionIds]);

  async function handleSubmitTest() {
    if (!sessionId) return;
    const payload = {
      sessionId,
      answers: questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? "",
      })),
    };
    const res = await fetch(`/api/tests/${test.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("Submit failed");
      return;
    }
    const data = await res.json();
    setResult({
      score: data.score,
      totalScore: data.totalScore,
      maxScore: data.maxScore,
      results: data.results ?? [],
    });
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-zinc-600">Loading test…</p>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-zinc-900">Results</h1>
        <p className="mt-2 text-zinc-600">
          Score: {(result.score * 100).toFixed(0)}% ({result.totalScore} / {result.maxScore})
        </p>
        <ul className="mt-4 space-y-3">
          {result.results.map((r, i) => (
            <li key={r.questionId} className="rounded border border-zinc-200 bg-white p-3">
              <span className="font-mono text-sm text-zinc-500">{r.questionId}</span>
              <span className={r.passed ? " text-green-600" : " text-red-600"}>
                {r.passed ? " ✓" : " ✗"}
              </span>
              <p className="mt-1 text-sm text-zinc-700">{r.feedback}</p>
            </li>
          ))}
        </ul>
        <Link href="/tests" className="mt-6 inline-block text-zinc-600 hover:underline">
          Back to tests
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-zinc-600">This test has no questions yet.</p>
        <Link href="/tests" className="mt-4 inline-block text-zinc-600 hover:underline">
          Back to tests
        </Link>
      </div>
    );
  }

  const q = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">{test.title}</h1>
        <Link href="/tests" className="text-sm text-zinc-600 hover:underline">
          Exit
        </Link>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Question {currentIndex + 1} of {questions.length}
      </p>
      {error && <p className="mt-2 text-red-600">{error}</p>}
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="prose prose-zinc max-w-none">
          {q.promptFormat === "md" ? (
            <ReactMarkdown>{q.prompt}</ReactMarkdown>
          ) : (
            <pre className="whitespace-pre-wrap text-zinc-800">{q.prompt}</pre>
          )}
        </div>
        <div className="mt-4">
          {q.type === "multiple_choice" && q.options && (
            <ul className="space-y-2">
              {q.options.map((opt) => (
                <li key={opt.id}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.id}
                      checked={(answers[q.id] ?? "") === opt.id}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                      }
                    />
                    <span>{opt.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {(q.type === "short_answer" || q.type === "long_answer") && (
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
              }
              rows={4}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-800"
              placeholder="Your answer"
            />
          )}
          {q.type === "bash" && (
            <BashAnswer
              value={answers[q.id] ?? ""}
              onChange={(v) =>
                setAnswers((prev) => ({ ...prev, [q.id]: v }))
              }
            />
          )}
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
          >
            Previous
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitTest}
            className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
          >
            Submit test
          </button>
        )}
      </div>
    </div>
  );
}

function BashAnswer({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [stdout, setStdout] = useState("");
  const [running, setRunning] = useState(false);
  async function runCode() {
    setRunning(true);
    setStdout("");
    const res = await fetch("/api/run-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: value, language: "bash" }),
    });
    const data = await res.json();
    setStdout([data.stdout, data.stderr].filter(Boolean).join("\n") || "(no output)");
    setRunning(false);
  }
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="font-mono w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
        placeholder="# Your bash script"
      />
      <button
        type="button"
        onClick={runCode}
        disabled={running}
        className="rounded border border-zinc-300 bg-zinc-100 px-3 py-1 text-sm hover:bg-zinc-200 disabled:opacity-50"
      >
        {running ? "Running…" : "Run code"}
      </button>
      {stdout && (
        <pre className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap">
          {stdout}
        </pre>
      )}
    </div>
  );
}
