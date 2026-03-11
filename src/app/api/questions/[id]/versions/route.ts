import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionStore } from "@/lib/questions/get-store";
import {
  serializeQuestion,
  validateMultipleChoicePayload,
  validateBashPayload,
  validateBashPredictOutputPayload,
  bumpVersion,
  type VersionBumpType,
} from "@/lib/questions";
import {
  getLatestQuestionVersion,
  getQuestionOwner,
  insertQuestionVersion,
} from "@/lib/questions/store-db";
import { dualWriteToFs } from "@/lib/questions/dual-write";

function validatePayload(payload: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const type = payload.type;
  if (type === "multiple_choice") return validateMultipleChoicePayload(payload);
  if (type === "bash") return validateBashPayload(payload);
  if (type === "bash_predict_output") return validateBashPredictOutputPayload(payload);
  return { valid: false, errors: ["type must be multiple_choice, bash, or bash_predict_output"] };
}

function buildPayload(body: Record<string, unknown>): Record<string, unknown> {
  const type = body.type;
  if (type === "bash") {
    return {
      type: "bash",
      title: body.title,
      domain: body.domain,
      prompt: body.prompt,
      solutionScript: body.solutionScript,
      tests: body.tests,
      sandboxZipRef: body.sandboxZipRef,
    };
  }
  if (type === "bash_predict_output") {
    return {
      type: "bash_predict_output",
      title: body.title,
      domain: body.domain,
      prompt: body.prompt,
      scriptSource: body.scriptSource,
      expectedOutput: body.expectedOutput,
    };
  }
  return {
    type: "multiple_choice",
    title: body.title,
    domain: body.domain,
    prompt: body.prompt,
    options: body.options,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: logicalId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const versionBump = body.versionBump as VersionBumpType | undefined;
    if (
      !versionBump ||
      !["question_major", "question_minor", "answer_major", "answer_minor"].includes(versionBump)
    ) {
      return NextResponse.json(
        { error: "versionBump required: question_major | question_minor | answer_major | answer_minor" },
        { status: 400 }
      );
    }
    const payload = buildPayload(body);
    const validation = validatePayload(payload);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }
    const supabase = await createClient();
    const { data: latest, error: latestErr } = await getLatestQuestionVersion(
      supabase,
      logicalId
    );
    if (latestErr || !latest) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    const nextVersion = bumpVersion(latest.version, versionBump);
    if (!nextVersion) {
      return NextResponse.json({ error: "Invalid version bump" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const { files, error: serError } = serializeQuestion(
      payload as unknown as Parameters<typeof serializeQuestion>[0],
      { logicalId, version: nextVersion, created_at: now, modified_at: now }
    );
    if (serError) {
      return NextResponse.json({ error: serError }, { status: 400 });
    }
    const store = await getQuestionStore();
    const writeErr = await store.write(logicalId, nextVersion, files);
    if (writeErr) {
      return NextResponse.json({ error: "Write failed", details: writeErr }, { status: 500 });
    }
    const questionOwner = await getQuestionOwner(supabase, logicalId);
    const ownerId = questionOwner ?? user.id;
    const isOwner = ownerId === user.id;
    const storagePath = `${logicalId}/${nextVersion}`;
    const payloadType = (payload as { type: string }).type;
    const { error: dbError } = await insertQuestionVersion(supabase, {
      logical_id: logicalId,
      version: nextVersion,
      owner_id: ownerId,
      type: payloadType,
      title: (payload as { title?: string }).title ?? null,
      domain: (payload as { domain?: string }).domain ?? null,
      storage_path: storagePath,
      status: isOwner ? "approved" : "pending",
      proposed_by: isOwner ? null : user.id,
    });
    if (dbError) {
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }
    await dualWriteToFs({
      logicalId,
      version: nextVersion,
      dbRow: {
        owner_id: ownerId,
        status: isOwner ? "approved" : "pending",
        proposed_by: isOwner ? null : user.id,
      },
      contentFiles: files,
    });
    return NextResponse.json({
      logicalId,
      version: nextVersion,
      status: isOwner ? "approved" : "pending",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    const { reportError } = await import("@/lib/report");
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "POST /api/questions/[id]/versions",
    });
    return NextResponse.json({ error: "Unauthorized or request failed" }, { status: 401 });
  }
}
