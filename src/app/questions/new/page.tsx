import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CreateQuestionByType } from "./create-question-by-type";

export default async function NewQuestionPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-zinc-50 px-[1em] py-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Create question</h1>
          <Link href="/questions" className="text-sm text-zinc-600 hover:underline">
            Back to my questions
          </Link>
        </div>
        <p className="mt-2 text-zinc-600">
          Choose the question type: multiple choice, Bash (write code, auto-check), or Bash predict output (explain output, no terminal).
        </p>
        <CreateQuestionByType className="mt-6" />
      </div>
    </div>
  );
}
