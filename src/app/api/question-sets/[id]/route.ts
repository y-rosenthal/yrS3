import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getQuestionSetById } from "@/lib/question-sets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const supabase = await createClient();
    const set = await getQuestionSetById(supabase, id);
    if (!set) {
      return NextResponse.json({ error: "Question set not found" }, { status: 404 });
    }
    return NextResponse.json(set);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    const { reportError } = await import("@/lib/report");
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "GET /api/question-sets/[id]",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
