"use client";

import { useRef, useEffect, useCallback } from "react";

export interface QuestionListEntry {
  id: string;
  type: string;
  version: string;
  title?: string;
  domain?: string;
  tags?: string[];
}

type Props = {
  questions: QuestionListEntry[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  /** Optional column content per row (e.g. "Add to set" button). Stops propagation on click. */
  actionColumn?: (question: QuestionListEntry, index: number) => React.ReactNode;
  /** Optional: question IDs to visually highlight (e.g. "added to set"). Rows with matching id get a highlight style. */
  highlightQuestionIds?: string[] | Set<string>;
  ariaLabel?: string;
};

function isHighlighted(id: string, highlightIds: string[] | Set<string> | undefined): boolean {
  if (!highlightIds) return false;
  return Array.isArray(highlightIds) ? highlightIds.includes(id) : highlightIds.has(id);
}

export function AvailableQuestionsTable({
  questions,
  selectedIndex,
  onSelectIndex,
  actionColumn,
  highlightQuestionIds,
  ariaLabel = "Questions list",
}: Props) {
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (questions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onSelectIndex(
          selectedIndex === null ? 0 : Math.min(selectedIndex + 1, questions.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onSelectIndex(
          selectedIndex === null ? questions.length - 1 : Math.max(0, selectedIndex - 1)
        );
      }
    },
    [questions.length, selectedIndex, onSelectIndex]
  );

  useEffect(() => {
    if (selectedIndex == null) return;
    rowRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedIndex]);

  return (
    <div
      ref={tableWrapperRef}
      tabIndex={0}
      role="grid"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="min-w-0 overflow-x-auto rounded-lg border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-zinc-300"
    >
      <table className="min-w-[48rem] w-full divide-y divide-zinc-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
              ID
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
              Title
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
              Type
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
              Domain
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
              Tags
            </th>
            {actionColumn && (
              <th className="px-4 py-2 text-left text-sm font-medium text-zinc-700">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {questions.map((q, idx) => {
            const highlighted = isHighlighted(q.id, highlightQuestionIds);
            return (
            <tr
              key={q.id}
              ref={(el) => {
                rowRefs.current[idx] = el;
              }}
              role="row"
              aria-selected={selectedIndex === idx}
              aria-pressed={highlighted}
              tabIndex={-1}
              onClick={() => onSelectIndex(idx)}
              className={`cursor-pointer hover:bg-zinc-50 ${
                selectedIndex === idx ? "bg-zinc-100" : ""
              } ${
                highlighted
                  ? "border-l-4 border-l-green-500 bg-green-50/70"
                  : ""
              }`}
            >
              <td className="px-4 py-2 font-mono text-sm text-zinc-800">
                {q.id}
              </td>
              <td className="px-4 py-2 text-sm text-zinc-700">
                {q.title ?? "—"}
              </td>
              <td className="px-4 py-2 text-sm text-zinc-600">{q.type}</td>
              <td className="px-4 py-2 text-sm text-zinc-600">
                {q.domain ?? "—"}
              </td>
              <td className="px-4 py-2">
                {q.tags?.length ? (
                  <span className="flex flex-wrap gap-1">
                    {q.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-sm text-zinc-400">—</span>
                )}
              </td>
              {actionColumn && (
                <td
                  className="px-4 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionColumn(q, idx)}
                </td>
              )}
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
