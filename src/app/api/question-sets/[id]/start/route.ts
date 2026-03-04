import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { resolveSetIdForSession } from "@/lib/question-sets";
import { logStudent } from "@/lib/logger";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id: setIdParam } = await params;
  const supabase = await createClient();
  const resolved = await resolveSetIdForSession(supabase, setIdParam);
  if (!resolved) {
    return NextResponse.json({ error: "Question set not found" }, { status: 404 });
  }
  const { setId, questionLogicalIds } = resolved;

  const { data: existing } = await supabase
    .from("test_sessions")
    .select("id, attempt_number")
    .eq("user_id", user.id)
    .eq("set_id", setId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const attemptNumber = existing ? (existing.attempt_number ?? 0) + 1 : 1;

  const { data: session, error } = await supabase
    .from("test_sessions")
    .insert({
      user_id: user.id,
      set_id: setId,
      attempt_number: attemptNumber,
    })
    .select("id, started_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  logStudent("test_start", user.id, {
    setId,
    sessionId: session.id,
    attemptNumber,
  });
  return NextResponse.json({
    sessionId: session.id,
    setId,
    questionIds: questionLogicalIds,
    startedAt: session.started_at,
  });
}
