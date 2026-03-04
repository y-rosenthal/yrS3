import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CreateSetForm } from "./create-set-form";

export default async function NewQuestionSetPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Create question set</h1>
          <Link href="/question-sets" className="text-sm text-zinc-600 hover:underline">
            Back to question sets
          </Link>
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          Add a title and choose which questions to include. You can use this set as a test, homework, or study list.
        </p>
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
          <CreateSetForm />
        </div>
      </div>
    </div>
  );
}
