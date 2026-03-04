import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Server-side handler for email confirmation. Supabase redirects here with ?code=...
 * or ?token_hash=...&type=... . The code exchange must run on the server so the
 * PKCE code_verifier in cookies (set during signUp) is available.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const origin = url.origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      return NextResponse.redirect(origin + "/");
    }
    if (error) {
      return NextResponse.redirect(
        origin + "/login?error=" + encodeURIComponent(error.message)
      );
    }
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "signup" | "recovery" | "magiclink" | "email_change" | "invite",
    });
    if (!error && data.session) {
      return NextResponse.redirect(origin + "/");
    }
    if (error) {
      return NextResponse.redirect(
        origin + "/login?error=" + encodeURIComponent(error.message)
      );
    }
  }

  return NextResponse.redirect(
    origin + "/login?error=" + encodeURIComponent("Missing confirmation link parameters. Please use the link from your email.")
  );
}
