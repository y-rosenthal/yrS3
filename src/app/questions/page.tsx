import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyQuestionsWithLatest, listPendingVersionsForOwner } from "@/lib/questions/store-db";
import { PendingApprovalList } from "./pending-approval-list";

export default async function MyQuestionsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: questions } = await listMyQuestionsWithLatest(supabase, user.id);
  const { data: pending } = await listPendingVersionsForOwner(supabase, user.id);
  const list = questions ?? [];
  const pendingList = pending ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 px-[1em] py-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">My questions</h1>
          <div className="flex gap-3">
            <Link
              href="/questions/new"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
            >
              Create question
            </Link>
            <Link href="/" className="text-sm text-zinc-600 hover:underline">
              Home
            </Link>
          </div>
        </div>
        <p className="mt-2 text-zinc-600">
          Create and manage your questions. Anyone can propose a new version; only you can approve.
        </p>
        <PendingApprovalList pending={pendingList} />
        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-800">Your questions</h2>
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {list.length === 0 ? (
              <li className="px-4 py-6 text-zinc-500">No questions yet. Create one to get started.</li>
            ) : (
              list.map((q) => (
                <li key={`${q.logical_id}-${q.version}`} className="px-4 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-zinc-800">{q.logical_id}</span>
                      <span className="ml-2 text-sm text-zinc-500">
                        v{q.version} · {q.type}
                        {q.title && ` · ${q.title}`}
                      </span>
                    </div>
                    <Link
                      href={`/questions/${q.logical_id}/new-version`}
                      className="text-sm text-zinc-600 hover:underline"
                    >
                      New version
                    </Link>
                  </div>
                  {q.domain && (
                    <div className="mt-1 text-sm text-zinc-500">Domain: {q.domain}</div>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
