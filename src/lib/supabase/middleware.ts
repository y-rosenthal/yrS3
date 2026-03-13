import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  if (process.env.SUPABASE_SKIP_AUTH_REFRESH === "true") {
    return NextResponse.next({ request });
  }
  // #region agent log
  fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "supabase/middleware.ts:updateSession",
      message: "middleware updateSession entry",
      data: { path: request.nextUrl.pathname },
      timestamp: Date.now(),
      hypothesisId: "H1",
    }),
  }).catch(() => {});
  // #endregion
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  try {
    await supabase.auth.getUser();
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "supabase/middleware.ts:afterGetUser",
        message: "middleware getUser() succeeded",
        data: { path: request.nextUrl.pathname },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
    // #endregion
  } catch (e) {
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "supabase/middleware.ts:getUserCatch",
        message: "middleware getUser() threw, returning next() so app still renders",
        data: { path: request.nextUrl.pathname, error: String(e), name: e instanceof Error ? e.name : "" },
        timestamp: Date.now(),
        hypothesisId: "H1",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion
    return supabaseResponse;
  }
  return supabaseResponse;
}
