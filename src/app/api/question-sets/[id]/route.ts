import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getQuestionSetById, updateQuestionSet } from "@/lib/question-sets";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { instructions } = body as { instructions?: string };
    const supabase = await createClient();
    const set = await getQuestionSetById(supabase, id);
    if (!set) {
      return NextResponse.json({ error: "Question set not found" }, { status: 404 });
    }
    const ok = await updateQuestionSet(supabase, set.id, {
      ...(instructions !== undefined && { instructions: instructions?.trim() || null }),
    });
    if (!ok) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    const updated = await getQuestionSetById(supabase, id);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    const { reportError } = await import("@/lib/report");
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "PATCH /api/question-sets/[id]",
    });
    return NextResponse.json({ error: "Unauthorized or update failed" }, { status: 401 });
  }
}
