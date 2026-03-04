import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionStore } from "@/lib/questions/get-store";
import {
  serializeQuestion,
  validateMultipleChoicePayload,
  INITIAL_VERSION,
} from "@/lib/questions";
import { insertQuestionVersion } from "@/lib/questions/store-db";
import { logQuestions } from "@/lib/logger";

export async function GET() {
  try {
    const user = await requireUser();
    const store = await getQuestionStore();
    const list = await store.list();
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const payload = body as {
      type?: string;
      title?: string;
      domain?: string;
      prompt?: string;
      options?: Array<{ id: string; text: string; correct?: boolean }>;
    };
    const validation = validateMultipleChoicePayload(payload);
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
      {
        type: "multiple_choice",
        title: payload.title,
        domain: payload.domain,
        prompt: payload.prompt!,
        options: payload.options!,
      },
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
      type: "multiple_choice",
      title: payload.title ?? null,
      domain: payload.domain ?? null,
      storage_path: storagePath,
    });
    if (dbError) {
      return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
    }
    return NextResponse.json({ logicalId, version });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized or request failed" }, { status: 401 });
  }
}
