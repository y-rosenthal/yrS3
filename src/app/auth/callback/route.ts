import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAuth } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // #region agent log
    await fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "auth/callback/route.ts:GET",
        message: error ? "OAuth exchangeCodeForSession error" : "OAuth exchangeCodeForSession success",
        data: { hasUser: !!data?.user, errorMessage: error?.message },
        timestamp: Date.now(),
        hypothesisId: "H4",
      }),
    }).catch(() => {});
    // #endregion
    if (!error && data.user) {
      logAuth("sign_in", data.user.id, { provider: "github" });
    }
    if (error) {
      logAuth("sign_in_failure", undefined, { error: error.message });
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
