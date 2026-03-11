import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Tutorial & Testing System
        </h1>
        <p className="mt-2 text-zinc-600">
          MVP — Question sets (take as test), create and manage questions, track progress.
        </p>
        <nav className="mt-8 flex flex-col gap-4">
          <Link
            href="/question-sets"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-800 hover:bg-zinc-50"
          >
            Question sets — Take as test
          </Link>
          <Link
            href="/questions"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-800 hover:bg-zinc-50"
          >
            My questions — Create & manage
          </Link>
          <Link
            href="/author"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-800 hover:bg-zinc-50"
          >
            Upload questions (files)
          </Link>
          <Link
            href="/logs"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-800 hover:bg-zinc-50"
          >
            System log
          </Link>
          <form action="/api/auth/signout" method="post" className="mt-4">
            <button
              type="submit"
              className="text-sm text-zinc-500 hover:underline"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
