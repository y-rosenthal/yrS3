"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-xl font-semibold text-zinc-900">Something went wrong</h1>
          <p className="text-sm text-zinc-600 max-w-md text-center">
            {error.message}
          </p>
          <p className="text-xs text-zinc-500 max-w-md text-center">
            If the auth or database service is unavailable, try starting it and refreshing.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Try again
          </button>
          <a href="/login" className="text-sm text-zinc-600 underline hover:text-zinc-900">
            Go to login
          </a>
        </div>
      </body>
    </html>
  );
}
