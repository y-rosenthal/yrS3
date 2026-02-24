import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getTestById } from "@/lib/tests-config";
import { logStudent } from "@/lib/logger";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id: testId } = await params;
  const test = getTestById(testId);
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("test_sessions")
    .select("id, attempt_number")
    .eq("user_id", user.id)
    .eq("test_id", testId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const attemptNumber = existing ? (existing.attempt_number ?? 0) + 1 : 1;
  const { data: session, error } = await supabase
    .from("test_sessions")
    .insert({
      user_id: user.id,
      test_id: testId,
      attempt_number: attemptNumber,
    })
    .select("id, started_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  logStudent("test_start", user.id, {
    testId,
    sessionId: session.id,
    attemptNumber,
  });
  return NextResponse.json({
    sessionId: session.id,
    testId,
    questionIds: test.questionIds,
    startedAt: session.started_at,
  });
}
