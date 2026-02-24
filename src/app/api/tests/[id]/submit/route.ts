import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getQuestionStore } from "@/lib/questions/get-store";
import { evaluate } from "@/lib/evaluators";
import { getTestById } from "@/lib/tests-config";
import { logStudent } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id: testId } = await params;
  const test = getTestById(testId);
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }
  const body = await request.json();
  const { sessionId, answers } = body as {
    sessionId: string;
    answers: Array<{ questionId: string; answer: string; keystrokeMetrics?: unknown }>;
  };
  if (!sessionId || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: "sessionId and answers array required" },
      { status: 400 }
    );
  }
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("test_sessions")
    .select("id, user_id, submitted_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session || session.submitted_at) {
    return NextResponse.json(
      { error: "Session not found or already submitted" },
      { status: 400 }
    );
  }
  const store = await getQuestionStore();
  let totalScore = 0;
  let maxScore = 0;
  const results: Array<{
    questionId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    feedback: string;
  }> = [];
  for (const a of answers) {
    const question = await store.get(a.questionId);
    if (!question) continue;
    const evalResult = await evaluate(question, a.answer ?? "");
    totalScore += evalResult.score;
    maxScore += evalResult.maxScore;
    results.push({
      questionId: a.questionId,
      score: evalResult.score,
      maxScore: evalResult.maxScore,
      passed: evalResult.passed,
      feedback: evalResult.feedback,
    });
    await supabase.from("answers").insert({
      session_id: sessionId,
      question_id: question.id,
      question_version: question.version,
      answer_text: a.answer,
      evaluation_json: evalResult,
      score: evalResult.score,
      keystroke_metrics: a.keystrokeMetrics ?? null,
      submitted_at: new Date().toISOString(),
    });
  }
  const finalScore = maxScore > 0 ? totalScore / maxScore : 0;
  await supabase
    .from("test_sessions")
    .update({
      submitted_at: new Date().toISOString(),
      score: finalScore,
    })
    .eq("id", sessionId);
  logStudent("test_submit", user.id, {
    testId,
    sessionId,
    totalScore,
    maxScore,
    finalScore,
  });
  return NextResponse.json({
    ok: true,
    score: finalScore,
    totalScore,
    maxScore,
    results,
  });
}
