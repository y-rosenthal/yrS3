import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/report";

/**
 * POST /api/report-error
 * Client-side error boundary sends errors here so they are logged to file and system-message store.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack } = body as { message?: string; stack?: string };
    const err = new Error(typeof message === "string" ? message : "Client error");
    if (typeof stack === "string") {
      err.stack = stack;
    }
    reportError(err, { source: "error-boundary" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
