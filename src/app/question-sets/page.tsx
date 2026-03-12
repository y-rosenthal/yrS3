import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listQuestionSets } from "@/lib/question-sets";

export default async function QuestionSetsPage() {
  await requireUser();
  const supabase = await createClient();
  const sets = await listQuestionSets(supabase);

  return (
    <div className="min-h-screen bg-zinc-50 px-[1em] py-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Question sets</h1>
          <div className="flex gap-3">
            <Link
              href="/question-sets/new"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
            >
              Create question set
            </Link>
            <Link href="/" className="text-sm text-zinc-600 hover:underline">
              Home
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          Use a set as a test, homework, or study list. Click &quot;Take as test&quot; to answer and submit for a score.
        </p>
        <ul className="mt-6 space-y-4">
          {sets.length === 0 ? (
            <li className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-zinc-500">
              No question sets yet. Create one in the UI or add sets under <code className="text-zinc-700">question-sets/</code> and run sync (same as questions).
            </li>
          ) : (
            sets.map((set) => (
              <li key={set.id}>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-300 bg-white p-4">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-zinc-900">{set.title}</span>
                    {set.description && (
                      <p className="mt-1 text-sm text-zinc-600">{set.description}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">
                      {set.questionCount} question(s)
                      {set.sourceSlug && ` · from repo (${set.sourceSlug})`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/question-sets/${encodeURIComponent(set.id)}/edit`}
                      className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/question-sets/${encodeURIComponent(set.id)}/take`}
                      className="rounded bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                    >
                      Take as test
                    </Link>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
