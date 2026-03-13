"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAvailableTags } from "./tag-filter-bar-load";

type Props = {
  chosenTags: string[];
  onChosenTagsChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
};

export function TagFilterBar({
  chosenTags,
  onChosenTagsChange,
  label = "Filter by tags:",
  placeholder = "Add tags…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const tags = await fetchAvailableTags();
      setAvailableTags(tags);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadTags();
      setTagFilter("");
      inputRef.current?.focus();
    }
  }, [open, loadTags]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = tagFilter.trim()
    ? availableTags.filter((t) =>
        t.toLowerCase().includes(tagFilter.trim().toLowerCase())
      )
    : availableTags;

  const addTag = (tag: string) => {
    if (!chosenTags.includes(tag)) {
      onChosenTagsChange([...chosenTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    onChosenTagsChange(chosenTags.filter((t) => t !== tag));
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {label && (
        <span className="text-sm font-medium text-zinc-700">{label}</span>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {chosenTags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2.5 py-0.5 text-sm text-zinc-800"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="rounded-full p-0.5 hover:bg-zinc-300"
              aria-label={`Remove tag ${t}`}
            >
              <span className="sr-only">Remove</span>
              <span aria-hidden>×</span>
            </button>
          </span>
        ))}
        <div className="relative" ref={popupRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            {placeholder}
          </button>
          {open && (
            <div
              className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded border border-zinc-200 bg-white py-2 shadow-lg"
              role="listbox"
            >
              <div className="border-b border-zinc-100 px-2 pb-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="Filter tags…"
                  className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                  aria-label="Filter tag names"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <p className="px-3 py-2 text-sm text-zinc-500">Loading…</p>
                ) : filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-zinc-500">
                    {tagFilter.trim() ? "No matching tags" : "No tags yet"}
                  </p>
                ) : (
                  filtered.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-zinc-800 hover:bg-zinc-100"
                      role="option"
                    >
                      {t}
                      {chosenTags.includes(t) && (
                        <span className="text-zinc-500">✓</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
