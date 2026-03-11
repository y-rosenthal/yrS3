import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BrowseQuestionsClient } from "./browse-questions-client";

export default async function BrowseQuestionsPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Browse questions</h1>
          <Link href="/" className="text-sm text-zinc-600 hover:underline">
            Home
          </Link>
        </div>
        <p className="mt-2 text-zinc-600">
          View all approved questions. Filter by tags to find questions by topic.
        </p>
        <section className="mt-6">
          <BrowseQuestionsClient />
        </section>
      </div>
    </div>
  );
}
