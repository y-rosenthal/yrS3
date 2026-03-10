"use client";

import { useState } from "react";
import type { TestCaseYaml } from "@/lib/questions/types";

type InitialData = {
  title?: string;
  domain?: string;
  prompt?: string;
  solutionScript?: string;
  tests?: TestCaseYaml[];
  sandboxZipRef?: string;
};

type Props = {
  className?: string;
  logicalId?: string;
  versionBump?: boolean;
  initialData?: InitialData;
};

export function CreateBashForm({
  className = "",
  logicalId,
  versionBump = false,
  initialData,
}: Props) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [domain, setDomain] = useState(initialData?.domain ?? "");
  const [prompt, setPrompt] = useState(initialData?.prompt ?? "");
  const [solutionScript, setSolutionScript] = useState(initialData?.solutionScript ?? "");
  const [sandboxZipRef, setSandboxZipRef] = useState(initialData?.sandboxZipRef ?? "");
  const [tests, setTests] = useState<TestCaseYaml[]>(
    initialData?.tests?.length ? initialData.tests : [{ description: "Default", stdin: "" }]
  );
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
    if (!solutionScript.trim()) {
      setMessage("Solution script is required.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setMessage("");
    const payload = {
      type: "bash" as const,
      title: title.trim() || undefined,
      domain: domain.trim() || undefined,
      prompt: prompt.trim(),
      solutionScript: solutionScript.trim(),
      tests: tests.length ? tests : undefined,
      sandboxZipRef: sandboxZipRef.trim() || undefined,
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
        setSolutionScript("");
        setSandboxZipRef("");
        setTests([{ description: "Default", stdin: "" }]);
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
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Solution script (reference answer) *</label>
          <textarea
            value={solutionScript}
            onChange={(e) => setSolutionScript(e.target.value)}
            rows={8}
            className="mt-1 block w-full font-mono text-sm rounded border border-zinc-300 px-3 py-2 text-zinc-800"
            placeholder="#!/bin/bash&#10;..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Sandbox zip ref (optional)</label>
          <input
            type="text"
            value={sandboxZipRef}
            onChange={(e) => setSandboxZipRef(e.target.value)}
            placeholder="e.g. tree.zip — filename in question folder or path"
            className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-zinc-800"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Zip file containing the folder tree for the sandbox. Per-test setup (e.g. touch, mkdir) still runs after extract.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Tests (optional)</label>
          <p className="mt-1 text-xs text-zinc-500 mb-2">
            Each test can have description, stdin, and setup (e.g. touch foo; mkdir -p a/b).
          </p>
          {tests.map((t, i) => (
            <div key={i} className="mb-2 rounded border border-zinc-200 bg-white p-2 space-y-1">
              <input
                type="text"
                value={t.description ?? ""}
                onChange={(e) =>
                  setTests((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x))
                  )
                }
                placeholder="Description"
                className="block w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={t.stdin ?? ""}
                onChange={(e) =>
                  setTests((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, stdin: e.target.value } : x))
                  )
                }
                placeholder="stdin"
                className="block w-full rounded border border-zinc-300 px-2 py-1 text-sm font-mono"
              />
              <input
                type="text"
                value={t.setup ?? ""}
                onChange={(e) =>
                  setTests((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, setup: e.target.value } : x))
                  )
                }
                placeholder="setup (e.g. touch foo)"
                className="block w-full rounded border border-zinc-300 px-2 py-1 text-sm font-mono"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setTests((prev) => [...prev, { description: "", stdin: "", setup: "" }])
            }
            className="text-sm text-zinc-600 hover:underline"
          >
            Add test
          </button>
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
