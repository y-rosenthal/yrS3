"use client";

import { Suspense, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-200 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Tutorial & Testing System
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Take tests, create questions, track progress
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-zinc-200/50 border border-zinc-200/80 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-200">
            <button
              type="button"
              onClick={() => { setMode("signin"); setMessage(null); }}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setMessage(null); }}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
              }`}
            >
              Create account
            </button>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSubmit} className="p-5 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-500 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50/50 px-3.5 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-500 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50/50 px-3.5 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in with email"}
            </button>
          </form>

          {/* Divider */}
          <div className="px-5 pb-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-zinc-400">or continue with</span>
              </div>
            </div>
            <button
              type="button"
              onClick={signInWithGitHub}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border-2 border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Sign in with GitHub
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <p
            role="alert"
            className={`mt-4 text-center text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}
          >
            {message.text}
          </p>
        )}

        <p className="mt-6 text-center">
          <a href="/" className="text-sm text-zinc-500 hover:text-zinc-700 hover:underline">
            Back to home
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-200 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center text-zinc-500">Loading…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
