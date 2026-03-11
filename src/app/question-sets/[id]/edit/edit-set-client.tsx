"use client";

import { useState } from "react";
import type { QuestionSetFile } from "@/lib/question-sets";

type Props = {
  setId: string;
  initialInstructions: string;
  initialFiles: QuestionSetFile[];
};

export function EditSetClient({ setId, initialInstructions, initialFiles }: Props) {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [files, setFiles] = useState<QuestionSetFile[]>(initialFiles);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  async function handleSaveInstructions() {
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/question-sets/${encodeURIComponent(setId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error ?? "Failed to save" });
        return;
      }
      setMessage({ type: "ok", text: "Instructions saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setMessage(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", uploadFile);
      if (uploadDesc.trim()) formData.set("description", uploadDesc.trim());
      const res = await fetch(`/api/question-sets/${encodeURIComponent(setId)}/files`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error ?? "Upload failed" });
        return;
      }
      const added = await res.json();
      setFiles((prev) => [
        ...prev,
        {
          id: added.id,
          filename: added.filename,
          description: added.description ?? null,
          storedPath: added.storedPath,
        },
      ]);
      setUploadFile(null);
      setUploadDesc("");
      setMessage({ type: "ok", text: "File added." });
    } catch {
      setMessage({ type: "error", text: "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId: string) {
    setMessage(null);
    try {
      const res = await fetch(
        `/api/question-sets/${encodeURIComponent(setId)}/files/${encodeURIComponent(fileId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error ?? "Delete failed" });
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setMessage({ type: "ok", text: "File removed." });
    } catch {
      setMessage({ type: "error", text: "Delete failed" });
    }
  }

  const downloadUrl = (fileId: string) =>
    `/api/question-sets/${encodeURIComponent(setId)}/files/${encodeURIComponent(fileId)}`;

  return (
    <div className="space-y-8">
      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-zinc-700">
          Instructions (shown when taking this set)
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
          placeholder="Optional instructions for test-takers"
        />
        <button
          type="button"
          onClick={handleSaveInstructions}
          disabled={saving}
          className="mt-2 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save instructions"}
        </button>
      </div>

      <div>
        <h2 className="text-base font-medium text-zinc-800">Attached files</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Add files that may be used to answer questions (e.g. data sets, reference docs). Each file can have a short description.
        </p>

        {files.length > 0 && (
          <ul className="mt-4 space-y-3">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-200 bg-zinc-50/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <a
                    href={downloadUrl(f.id)}
                    download={f.filename}
                    className="text-sm font-medium text-zinc-800 hover:underline"
                  >
                    {f.filename}
                  </a>
                  {f.description && (
                    <p className="mt-0.5 text-xs text-zinc-600">{f.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={downloadUrl(f.id)}
                    download={f.filename}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteFile(f.id)}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleUpload} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="file-upload" className="block text-xs font-medium text-zinc-600">
              Add file
            </label>
            <input
              id="file-upload"
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="mt-1 block text-sm text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm file:text-zinc-700"
            />
          </div>
          <div>
            <label htmlFor="file-desc" className="block text-xs font-medium text-zinc-600">
              Description (optional)
            </label>
            <input
              id="file-desc"
              type="text"
              value={uploadDesc}
              onChange={(e) => setUploadDesc(e.target.value)}
              placeholder="e.g. Sample data for Q2"
              className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800"
            />
          </div>
          <button
            type="submit"
            disabled={uploading || !uploadFile}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === "ok" ? "text-green-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
