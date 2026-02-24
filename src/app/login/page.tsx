"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  async function signInWithGitHub() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-100 p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Tutorial & Testing System
      </h1>
      <p className="text-zinc-600">
        Sign in with GitHub to take tests or manage questions.
      </p>
      <button
        type="button"
        onClick={signInWithGitHub}
        className="rounded-lg bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-800"
      >
        Sign in with GitHub
      </button>
      <a href="/" className="text-sm text-zinc-500 hover:underline">
        Back to home
      </a>
    </div>
  );
}
