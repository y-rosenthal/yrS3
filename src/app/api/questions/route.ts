import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionStore } from "@/lib/questions/get-store";
import {
  serializeQuestion,
  validateMultipleChoicePayload,
  validateBashPayload,
  validateBashPredictOutputPayload,
  INITIAL_VERSION,
  compareVersion,
} from "@/lib/questions";
import { listAllQuestionVersions, insertQuestionVersion } from "@/lib/questions/store-db";
import { dualWriteToFs } from "@/lib/questions/dual-write";
import { syncFsWithDb } from "@/lib/questions/sync-questions";
import { logQuestions } from "@/lib/logger";

/** Shared promise so concurrent GETs all wait for the same sync before listing (avoids race where sync is in progress but others read stale DB). */
let syncPromise: Promise<void> | null = null;

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    if (
      process.env.QUESTIONS_STORAGE !== "supabase" &&
      process.env.QUESTION_SYNC_OWNER_ID
    ) {
      syncPromise =
        syncPromise ??
        syncFsWithDb(supabase)
          .then(() => undefined)
          .catch((e) => {
            syncPromise = null;
            throw e;
          });
      await syncPromise;
    }

    const { data: allRows, error } = await listAllQuestionVersions(supabase);
    if (error) {
      return NextResponse.json({ error: "Failed to list questions" }, { status: 500 });
    }
    const approved = (allRows ?? []).filter((r) => r.status === "approved");
    const byLogicalId = new Map<string, (typeof approved)[0]>();
    approved.sort((a, b) => compareVersion(b.version, a.version));
    for (const row of approved) {
      if (!byLogicalId.has(row.logical_id)) {
        byLogicalId.set(row.logical_id, row);
      }
    }
    const list = Array.from(byLogicalId.values()).map((r) => ({
      id: r.logical_id,
      type: r.type,
      version: r.version,
      title: r.title ?? undefined,
      domain: r.domain ?? undefined,
    }));
    logQuestions("metadata_list", user.id, { count: list.length });
    return NextResponse.json(list);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json(
      { error: "Unauthorized or failed to list questions" },
      { status: 401 }
    );
  }
}

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

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as Record<string, unknown>;
    const payload = buildPayload(body);
    const validation = validatePayload(payload);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }
    const logicalId = crypto.randomUUID();
    const version = INITIAL_VERSION;
    const now = new Date().toISOString();
    const { files, error: serError } = serializeQuestion(
      payload as Parameters<typeof serializeQuestion>[0],
      { logicalId, version, created_at: now, modified_at: now }
    );
    if (serError) {
      return NextResponse.json({ error: serError }, { status: 400 });
    }
    const store = await getQuestionStore();
    const writeErr = await store.write(logicalId, version, files);
    if (writeErr) {
      return NextResponse.json({ error: "Write failed", details: writeErr }, { status: 500 });
    }
    const supabase = await createClient();
    const storagePath = `${logicalId}/${version}`;
    const { error: dbError } = await insertQuestionVersion(supabase, {
      logical_id: logicalId,
      version,
      owner_id: user.id,
      type: (payload as { type: string }).type,
      title: (payload as { title?: string }).title ?? null,
      domain: (payload as { domain?: string }).domain ?? null,
      storage_path: storagePath,
    });
    if (dbError) {
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }
    await dualWriteToFs({
      logicalId,
      version,
      dbRow: { owner_id: user.id, status: "approved", proposed_by: null },
      contentFiles: files,
    });
    return NextResponse.json({ logicalId, version });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized or request failed" }, { status: 401 });
  }
}
