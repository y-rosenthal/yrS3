"use client";

import { useState } from "react";

type InitialData = {
  title?: string;
  domain?: string;
  prompt?: string;
  scriptSource?: string;
  expectedOutput?: string;
};

type Props = {
  className?: string;
  logicalId?: string;
  versionBump?: boolean;
  initialData?: InitialData;
};

export function CreateBashPredictOutputForm({
  className = "",
  logicalId,
  versionBump = false,
  initialData,
}: Props) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [domain, setDomain] = useState(initialData?.domain ?? "");
  const [prompt, setPrompt] = useState(initialData?.prompt ?? "");
  const [scriptSource, setScriptSource] = useState(initialData?.scriptSource ?? "");
  const [expectedOutput, setExpectedOutput] = useState(initialData?.expectedOutput ?? "");
  const [versionBumpType, setVersionBumpType] = useState<
    "question_major" | "question_minor" | "answer_major" | "answer_minor"
  >("question_minor");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) {
      setMessage("Prompt is required.");
      setStatus("error");
      return;
    }
    if (!scriptSource.trim()) {
      setMessage("Script to show (script source) is required.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setMessage("");
    const payload = {
      type: "bash_predict_output" as const,
      title: title.trim() || undefined,
      domain: domain.trim() || undefined,
      prompt: prompt.trim(),
      scriptSource: scriptSource.trim(),
      expectedOutput: expectedOutput,
      ...(versionBump && logicalId ? { versionBump: versionBumpType } : {}),
    };
    const url =
      versionBump && logicalId
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
        setScriptSource("");
        setExpectedOutput("");
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
            placeholder="e.g. bash"
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
            placeholder="e.g. What output does the following script produce?"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Script to show (student sees this, no terminal) *</label>
          <textarea
            value={scriptSource}
            onChange={(e) => setScriptSource(e.target.value)}
            rows={10}
            className="mt-1 block w-full font-mono text-sm rounded border border-zinc-300 px-3 py-2 text-zinc-800"
            placeholder="#!/bin/bash&#10;echo hello"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Expected output (stored for editor review)</label>
          <textarea
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            rows={4}
            className="mt-1 block w-full font-mono text-sm rounded border border-zinc-300 px-3 py-2 text-zinc-800"
            placeholder="Exact output when the script is run (used for review; grading uses computed output)"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Stored for reviewers. At grading time the system runs the script and uses that output; if it differs, an error is logged.
          </p>
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
