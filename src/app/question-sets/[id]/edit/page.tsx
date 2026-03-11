import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionSetById } from "@/lib/question-sets";
import { notFound } from "next/navigation";
import { EditSetClient } from "./edit-set-client";

export default async function EditQuestionSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const set = await getQuestionSetById(supabase, id);
  if (!set) notFound();

  if (set.source !== "db") {
    return (
      <div className="min-h-screen bg-zinc-50 px-[1em] py-6">
        <div className="mx-auto w-full max-w-[800px]">
          <h1 className="text-2xl font-semibold text-zinc-900">Edit question set</h1>
          <p className="mt-2 text-sm text-zinc-600">
            File-based question sets cannot be edited here. Edit the set file in your repository instead.
          </p>
          <Link href="/question-sets" className="mt-4 inline-block text-sm text-zinc-600 hover:underline">
            Back to question sets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-[1em] py-6">
      <div className="mx-auto w-full max-w-[800px]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Edit question set</h1>
          <Link href="/question-sets" className="text-sm text-zinc-600 hover:underline">
            Back to question sets
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          {set.title}
          {set.questionLogicalIds.length > 0 && (
            <span> — {set.questionLogicalIds.length} question(s)</span>
          )}
        </p>
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <EditSetClient
            setId={set.id}
            initialInstructions={set.instructions ?? ""}
            initialFiles={set.files ?? []}
          />
        </div>
      </div>
    </div>
  );
}
