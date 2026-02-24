import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTestsConfig } from "@/lib/tests-config";

export default async function TestsPage() {
  await requireUser();
  const tests = getTestsConfig();

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Tests</h1>
          <Link href="/" className="text-sm text-zinc-600 hover:underline">
            Home
          </Link>
        </div>
        <ul className="mt-6 space-y-4">
          {tests.map((test) => (
            <li key={test.id}>
              <Link
                href={`/tests/${test.id}/take`}
                className="block rounded-lg border border-zinc-300 bg-white p-4 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{test.title}</span>
                {test.description && (
                  <p className="mt-1 text-sm text-zinc-600">{test.description}</p>
                )}
                <p className="mt-1 text-xs text-zinc-500">
                  {test.questionIds.length} question(s)
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
