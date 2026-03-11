"use client";

type Props = {
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  appliedTags: string[];
  onApply: () => void;
  onClear: () => void;
  label?: string;
  inputPlaceholder?: string;
  applyLabel?: string;
  clearLabel?: string;
};

export function TagFilterBar({
  tagFilter,
  onTagFilterChange,
  appliedTags,
  onApply,
  onClear,
  label = "Filter by tags (comma-separated):",
  inputPlaceholder = "e.g. bash, intro",
  applyLabel = "Apply",
  clearLabel = "Clear filter",
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="tag-filter" className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id="tag-filter"
        type="text"
        value={tagFilter}
        onChange={(e) => onTagFilterChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onApply())}
        placeholder={inputPlaceholder}
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800 w-48"
      />
      <button
        type="button"
        onClick={onApply}
        className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        {applyLabel}
      </button>
      {appliedTags.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-zinc-500 hover:underline"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
