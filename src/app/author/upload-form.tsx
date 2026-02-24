"use client";

import { useState } from "react";

type Props = {
  isModification: boolean;
  existingIds?: string[];
};

export function AuthorUploadForm({ isModification, existingIds = [] }: Props) {
  const [folderName, setFolderName] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!folderName.trim()) {
      setMessage("Folder name (question id) is required.");
      setStatus("error");
      return;
    }
    if (!files?.length) {
      setMessage("Select at least one file (e.g. meta.yaml, prompt.md).");
      setStatus("error");
      return;
    }
    setStatus("uploading");
    setMessage("");
    const formData = new FormData();
    formData.set("folderName", folderName.trim());
    formData.set("isModification", String(isModification));
    for (let i = 0; i < files.length; i++) {
      formData.append(files[i].name, files[i]);
    }
    const res = await fetch("/api/questions/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("ok");
      setMessage(`Saved: ${data.id}`);
      setFolderName("");
      setFiles(null);
    } else {
      setStatus("error");
      setMessage(data.details?.join?.(", ") ?? data.error ?? "Upload failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-3">
      <div>
        <label className="block text-sm text-zinc-600">
          Question id (folder name)
        </label>
        {isModification && existingIds.length > 0 && (
          <select
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded border border-zinc-300 px-3 py-2 text-zinc-800"
          >
            <option value="">Select existing…</option>
            {existingIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        )}
        {(!isModification || existingIds.length === 0) && (
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g. q-bash-001"
            className="mt-1 block w-full max-w-xs rounded border border-zinc-300 px-3 py-2 text-zinc-800"
          />
        )}
      </div>
      <div>
        <label className="block text-sm text-zinc-600">Files</label>
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="mt-1 block w-full max-w-md text-sm text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-zinc-200 file:px-3 file:py-1 file:text-zinc-800"
        />
      </div>
      <button
        type="submit"
        disabled={status === "uploading"}
        className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {status === "uploading" ? "Uploading…" : isModification ? "Update question" : "Upload new question"}
      </button>
      {message && (
        <p className={status === "error" ? "text-red-600" : "text-green-700"}>
          {message}
        </p>
      )}
    </form>
  );
}
