import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionStore } from "@/lib/questions/get-store";
import { getLatestQuestionVersion } from "@/lib/questions/store-db";
import { CreateQuestionForm } from "../../new/create-question-form";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ logicalId: string }> };

export default async function NewVersionPage({ params }: Props) {
  const user = await requireUser();
  const { logicalId } = await params;
  const supabase = await createClient();
  const { data: row, error } = await getLatestQuestionVersion(supabase, logicalId);
  if (error || !row) notFound();
  const store = await getQuestionStore();
  const question = await store.get(logicalId, row.version);
  if (!question || question.type !== "multiple_choice") notFound();

  const initialData = {
    title: question.title,
    domain: question.domain,
    prompt: question.prompt,
    options: question.options?.map((o) => ({
      id: o.id,
      text: o.text,
      correct: o.id === question.correctId || o.correct === true,
    })),
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">New version</h1>
          <Link href="/questions" className="text-sm text-zinc-600 hover:underline">
            Back to my questions
          </Link>
        </div>
        <p className="mt-2 text-zinc-600">
          Current version: {row.version}. Edit below and choose how the version should bump. If you
          are not the question owner, your new version will be pending until they approve it.
        </p>
        <CreateQuestionForm
          className="mt-6"
          logicalId={logicalId}
          versionBump
          initialData={initialData}
        />
      </div>
    </div>
  );
}
