import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionStore } from "@/lib/questions/get-store";
import {
  serializeQuestion,
  validateMultipleChoicePayload,
  bumpVersion,
  type VersionBumpType,
} from "@/lib/questions";
import {
  getLatestQuestionVersion,
  getQuestionOwner,
  insertQuestionVersion,
} from "@/lib/questions/store-db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: logicalId } = await params;
    const body = await request.json();
    const payload = body as {
      type?: string;
      title?: string;
      domain?: string;
      prompt?: string;
      options?: Array<{ id: string; text: string; correct?: boolean }>;
      versionBump: VersionBumpType;
    };
    if (
      !payload.versionBump ||
      !["question_major", "question_minor", "answer_major", "answer_minor"].includes(
        payload.versionBump
      )
    ) {
      return NextResponse.json(
        { error: "versionBump required: question_major | question_minor | answer_major | answer_minor" },
        { status: 400 }
      );
    }
    const validation = validateMultipleChoicePayload(payload);
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
    const nextVersion = bumpVersion(latest.version, payload.versionBump);
    if (!nextVersion) {
      return NextResponse.json({ error: "Invalid version bump" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const { files, error: serError } = serializeQuestion(
      {
        type: "multiple_choice",
        title: payload.title,
        domain: payload.domain,
        prompt: payload.prompt!,
        options: payload.options!,
      },
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
    const { error: dbError } = await insertQuestionVersion(supabase, {
      logical_id: logicalId,
      version: nextVersion,
      owner_id: ownerId,
      type: "multiple_choice",
      title: payload.title ?? null,
      domain: payload.domain ?? null,
      storage_path: storagePath,
      status: isOwner ? "approved" : "pending",
      proposed_by: isOwner ? null : user.id,
    });
    if (dbError) {
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }
    return NextResponse.json({
      logicalId,
      version: nextVersion,
      status: isOwner ? "approved" : "pending",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized or request failed" }, { status: 401 });
  }
}
