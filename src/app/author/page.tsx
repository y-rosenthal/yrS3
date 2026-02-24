import Link from "next/link";
import { requireAuthor } from "@/lib/auth";
import { getQuestionStore } from "@/lib/questions/get-store";
import { AuthorUploadForm } from "./upload-form";

export default async function AuthorPage() {
  await requireAuthor();
  const store = await getQuestionStore();
  const questions = await store.list();

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Question author
          </h1>
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:underline"
          >
            Home
          </Link>
        </div>
        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-800">Upload new question</h2>
          <AuthorUploadForm isModification={false} />
        </section>
        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-800">Upload modification</h2>
          <AuthorUploadForm isModification={true} existingIds={questions.map((q) => q.id)} />
        </section>
        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-800">Questions</h2>
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {questions.length === 0 ? (
              <li className="px-4 py-6 text-zinc-500">No questions yet.</li>
            ) : (
              questions.map((q) => (
                <li key={q.id} className="px-4 py-3">
                  <div className="flex justify-between">
                    <span className="font-mono text-zinc-800">{q.id}</span>
                    <span className="text-sm text-zinc-500">
                      {q.type} · v{q.version}
                      {q.created_at && ` · created ${q.created_at.slice(0, 10)}`}
                      {q.modified_at && ` · modified ${q.modified_at.slice(0, 10)}`}
                    </span>
                  </div>
                  {q.title && (
                    <div className="mt-1 text-sm text-zinc-600">{q.title}</div>
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
