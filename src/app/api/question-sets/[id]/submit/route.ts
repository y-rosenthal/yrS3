import path from "path";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getQuestionStore } from "@/lib/questions/get-store";
import { isSafeSandboxZipRef } from "@/lib/questions/validate";
import { evaluate } from "@/lib/evaluators";
import { logStudent } from "@/lib/logger";
import { extractZipToTemp } from "@/lib/extract-zip";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id: setIdParam } = await params;
  const body = await request.json();
  const { sessionId, answers } = body as {
    sessionId: string;
    answers: Array<{
      questionId: string;
      version?: string;
      answer: string;
      keystrokeMetrics?: unknown;
    }>;
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
    .select("id, user_id, set_id, submitted_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session || session.submitted_at) {
    return NextResponse.json(
      { error: "Session not found or already submitted" },
      { status: 400 }
    );
  }
  if (session.set_id !== setIdParam) {
    return NextResponse.json(
      { error: "Session does not match question set" },
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
  const tempDirs: string[] = [];
  try {
    for (const a of answers) {
      const version = a.version ?? "1.0.0.0";
      const question = await store.get(a.questionId, version);
      if (!question) continue;
      let sandboxCwd: string | undefined;
      if (
        question.type === "bash" &&
        question.sandboxZipRef &&
        isSafeSandboxZipRef(question.sandboxZipRef) &&
        store.getVersionFolderPath
      ) {
        const versionPath = await store.getVersionFolderPath(question.id, version);
        if (versionPath) {
          const zipPath = path.join(versionPath, question.sandboxZipRef);
          try {
            sandboxCwd = await extractZipToTemp(zipPath);
            tempDirs.push(sandboxCwd);
          } catch {
            // run without sandbox cwd if extract fails
          }
        }
      }
      const evalResult = await evaluate(question, a.answer ?? "", {
        sandboxCwd,
      });
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
      setId: session.set_id,
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
  } finally {
    for (const dir of tempDirs) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
