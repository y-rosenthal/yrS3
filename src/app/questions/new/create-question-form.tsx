"use client";

import { useState } from "react";

type Option = { id: string; text: string; correct: boolean };

const DEFAULT_OPTIONS: Option[] = [
  { id: "a", text: "", correct: true },
  { id: "b", text: "", correct: false },
];

type InitialData = {
  title?: string;
  domain?: string;
  prompt?: string;
  options?: Array<{ id: string; text: string; correct?: boolean }>;
};

type Props = {
  className?: string;
  logicalId?: string;
  versionBump?: boolean;
  initialData?: InitialData;
};

export function CreateQuestionForm({
  className = "",
  logicalId,
  versionBump = false,
  initialData,
}: Props) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [domain, setDomain] = useState(initialData?.domain ?? "");
  const [prompt, setPrompt] = useState(initialData?.prompt ?? "");
  const [options, setOptions] = useState<Option[]>(
    initialData?.options?.length
      ? initialData.options.map((o) => ({
          id: o.id,
          text: o.text,
          correct: o.correct === true,
        }))
      : DEFAULT_OPTIONS
  );
  const [versionBumpType, setVersionBumpType] = useState<
    "question_major" | "question_minor" | "answer_major" | "answer_minor"
  >("question_minor");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  function setOptionCorrect(index: number) {
    setOptions((prev) =>
      prev.map((opt, i) => ({ ...opt, correct: i === index }))
    );
  }

  function updateOption(index: number, field: "id" | "text", value: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  }

  function addOption() {
    const next = String.fromCharCode(97 + options.length);
    setOptions((prev) => [...prev, { id: next, text: "", correct: false }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const correctCount = options.filter((o) => o.correct).length;
    if (correctCount !== 1) {
      setMessage("Exactly one option must be marked correct.");
      setStatus("error");
      return;
    }
    if (!prompt.trim()) {
      setMessage("Prompt is required.");
      setStatus("error");
      return;
    }
    if (options.some((o) => !o.id.trim() || !o.text.trim())) {
      setMessage("Every option needs an id and text.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setMessage("");
    const payload = {
      type: "multiple_choice" as const,
      title: title.trim() || undefined,
      domain: domain.trim() || undefined,
      prompt: prompt.trim(),
      options: options.map((o) => ({ id: o.id.trim(), text: o.text.trim(), correct: o.correct })),
      ...(versionBump && logicalId ? { versionBump: versionBumpType } : {}),
    };
    const url = versionBump && logicalId
      ? `/api/questions/${logicalId}/versions`
      : "/api/questions";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("ok");
      const versionInfo = `logicalId: ${data.logicalId ?? logicalId}, version: ${data.version ?? ""}`;
      setMessage(
        data.status === "pending"
          ? `Submitted. ${versionInfo} — Pending approval by the question owner.`
          : `Saved. ${versionInfo}`
      );
      if (!versionBump) {
        setTitle("");
        setDomain("");
        setPrompt("");
        setOptions(DEFAULT_OPTIONS);
      }
    } else {
      setStatus("error");
      setMessage(data.details?.join?.(", ") ?? data.error ?? "Request failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-zinc-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Domain (optional)</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. bash, r"
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-zinc-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Prompt *</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-zinc-800"
            required
          />
        </div>
        {versionBump && logicalId && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">Version bump type</label>
            <select
              value={versionBumpType}
              onChange={(e) => setVersionBumpType(e.target.value as typeof versionBumpType)}
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-zinc-800"
            >
              <option value="question_major">Question meaning changed</option>
              <option value="question_minor">Question wording only</option>
              <option value="answer_major">Answer meaning/correctness changed</option>
              <option value="answer_minor">Answer wording or equivalent answer added</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Options *</label>
          <ul className="mt-2 space-y-2">
            {options.map((opt, i) => (
              <li key={i} className="flex items-center gap-2 rounded border border-zinc-200 bg-white p-2">
                <input
                  type="radio"
                  name="correct"
                  checked={opt.correct}
                  onChange={() => setOptionCorrect(i)}
                  className="rounded-full"
                />
                <input
                  type="text"
                  value={opt.id}
                  onChange={(e) => updateOption(i, "id", e.target.value)}
                  placeholder="id"
                  className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOption(i, "text", e.target.value)}
                  placeholder="Option text"
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm text-zinc-600 hover:underline"
          >
            Add option
          </button>
        </div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {status === "submitting" ? "Saving…" : versionBump ? "Create new version" : "Create question"}
        </button>
        {message && (
          <p className={status === "error" ? "text-red-600" : "text-green-700"}>{message}</p>
        )}
      </div>
    </form>
  );
}
