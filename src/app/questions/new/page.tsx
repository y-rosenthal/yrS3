import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CreateQuestionForm } from "./create-question-form";

export default async function NewQuestionPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Create question</h1>
          <Link href="/questions" className="text-sm text-zinc-600 hover:underline">
            Back to my questions
          </Link>
        </div>
        <p className="mt-2 text-zinc-600">
          Multiple choice only for now. Add prompt and options; mark exactly one as correct.
        </p>
        <CreateQuestionForm className="mt-6" />
      </div>
    </div>
  );
}
