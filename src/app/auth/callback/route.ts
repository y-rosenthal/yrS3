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
    if (!error && data.user) {
      logAuth("sign_in", data.user.id, { provider: "github" });
    }
    if (error) {
      logAuth("sign_in_failure", undefined, { error: error.message });
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
