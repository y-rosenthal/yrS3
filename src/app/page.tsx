import Link from "next/link";
import { getUser, isAuthor } from "@/lib/auth";

export default async function HomePage() {
  const user = await getUser();
  const author = await isAuthor();

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Tutorial & Testing System
        </h1>
        <p className="mt-2 text-zinc-600">
          MVP — Take tests, author questions, track progress.
        </p>
        <nav className="mt-8 flex flex-col gap-4">
          {user ? (
            <>
              <Link
                href="/tests"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-800 hover:bg-zinc-50"
              >
                Take a test
              </Link>
              {author && (
                <Link
                  href="/author"
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-800 hover:bg-zinc-50"
                >
                  Author — Upload & manage questions
                </Link>
              )}
              <form action="/api/auth/signout" method="post" className="mt-4">
                <button
                  type="submit"
                  className="text-sm text-zinc-500 hover:underline"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-zinc-900 px-4 py-3 text-white hover:bg-zinc-800 w-fit"
            >
              Sign in with GitHub
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
