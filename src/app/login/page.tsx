"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) setMessage({ type: "error", text: error });
  }, [searchParams]);

  async function signInWithGitHub() {
    setMessage(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;

    try {
      if (mode === "signup") {
        // #region agent log
        fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "login/page.tsx:handleEmailSubmit",
            message: "email signup attempt",
            data: { mode: "signup", emailLength: email.length },
            timestamp: Date.now(),
            hypothesisId: "H1",
          }),
        }).catch(() => {});
        // #endregion
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/auth/confirm` },
        });
        if (error) {
          setMessage({ type: "error", text: error.message });
          setLoading(false);
          return;
        }
        if (data.user && !data.session) {
          setMessage({
            type: "success",
            text: "Check your email for the confirmation link. (Local dev: open Mailpit at http://127.0.0.1:54324 to get the link.)",
          });
        } else if (data.session) {
          router.push("/");
          router.refresh();
        }
      } else {
        // #region agent log
        fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "login/page.tsx:handleEmailSubmit",
            message: "email signin attempt",
            data: { mode: "signin", emailLength: email.length },
            timestamp: Date.now(),
            hypothesisId: "H2",
          }),
        }).catch(() => {});
        // #endregion
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage({ type: "error", text: error.message });
          setLoading(false);
          return;
        }
        if (data.session) {
          router.push("/");
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-100 p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Tutorial & Testing System
      </h1>
      <p className="text-zinc-600">
        Sign in with email or GitHub to take tests or manage questions.
      </p>

      {/* Email form */}
      <form
        onSubmit={handleEmailSubmit}
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="flex gap-2 border-b border-zinc-200 pb-2">
          <button
            type="button"
            onClick={() => { setMode("signin"); setMessage(null); }}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${mode === "signin" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setMessage(null); }}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${mode === "signup" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            Sign up
          </button>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-800 px-4 py-2.5 font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "signup" ? "Sign up" : "Sign in"}
        </button>
      </form>

      {message && (
        <p
          className={`max-w-sm text-center text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-zinc-500">or</span>
        <button
          type="button"
          onClick={signInWithGitHub}
          className="rounded-lg bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-800"
        >
          Sign in with GitHub
        </button>
      </div>

      <a href="/" className="text-sm text-zinc-500 hover:underline">
        Back to home
      </a>
    </div>
  );
}
