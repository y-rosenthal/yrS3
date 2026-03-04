import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionStore } from "@/lib/questions/get-store";
import { validateQuestionUpload, isValidVersion } from "@/lib/questions";
import { getQuestionOwner, insertQuestionVersion } from "@/lib/questions/store-db";
import yaml from "js-yaml";
import { logQuestions } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const folderName = formData.get("folderName") as string | null;
    const version = formData.get("version") as string | null;
    const isModification = formData.get("isModification") === "true";
    if (!folderName?.trim()) {
      return NextResponse.json(
        { error: "folderName (logicalId) required" },
        { status: 400 }
      );
    }
    if (!version?.trim()) {
      return NextResponse.json(
        { error: "version required (four-part: e.g. 1.0.0.0)" },
        { status: 400 }
      );
    }
    if (!isValidVersion(version)) {
      return NextResponse.json(
        { error: "Invalid version format; use Q_MAJ.Q_MIN.A_MAJ.A_MIN (e.g. 1.0.0.0)" },
        { status: 400 }
      );
    }
    const logicalId = folderName.trim();
    const files: { name: string; content: string }[] = [];
    // #region agent log
    const formKeys: string[] = [];
    for (const [key] of formData.entries()) formKeys.push(key);
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "upload/route.ts:formData",
        message: "FormData keys and isModification",
        data: { formKeys, isModification },
        timestamp: Date.now(),
        hypothesisId: "H3",
      }),
    }).catch(() => {});
    // #endregion
    for (const [key, value] of formData.entries()) {
      if (key === "folderName" || key === "isModification" || key === "version") continue;
      if (value instanceof File) {
        const content = await value.text();
        files.push({ name: value.name || key, content });
      }
    }
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "upload/route.ts:filesExtracted",
        message: "Files extracted from form",
        data: {
          fileCount: files.length,
          fileNames: files.map((f) => f.name),
          contentLengths: files.map((f) => f.content.length),
        },
        timestamp: Date.now(),
        hypothesisId: "H3",
      }),
    }).catch(() => {});
    // #endregion
    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one file required" },
        { status: 400 }
      );
    }
    const validation = validateQuestionUpload(logicalId, files);
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "upload/route.ts:afterValidation",
        message: "Validation result and store.has",
        data: { validationValid: validation.valid, validationErrors: validation.errors },
        timestamp: Date.now(),
        hypothesisId: "H4",
      }),
    }).catch(() => {});
    // #endregion
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }
    const store = await getQuestionStore();
    const exists = await store.has(logicalId, version);
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "upload/route.ts:afterHas",
        message: "store.has and isModification path",
        data: { exists, isModification, logicalId, version },
        timestamp: Date.now(),
        hypothesisId: "H4",
      }),
    }).catch(() => {});
    // #endregion
    if (exists) {
      return NextResponse.json(
        { error: "This version already exists; use a new version (immutable)" },
        { status: 400 }
      );
    }
    if (isModification) {
      const list = await store.list();
      const hasAny = list.some((q) => q.id === logicalId);
      if (!hasAny) {
        return NextResponse.json(
          { error: "Question not found for modification (no existing version)" },
          { status: 404 }
        );
      }
    }
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "upload/route.ts:beforeWrite",
        message: "About to call store.write",
        data: { logicalId, version, fileCount: files.length, storageBackend: process.env.QUESTIONS_STORAGE ?? "fs" },
        timestamp: Date.now(),
        hypothesisId: "H5",
      }),
    }).catch(() => {});
    // #endregion
    const writeError = await store.write(logicalId, version, files);
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "upload/route.ts:afterWrite",
        message: "store.write result",
        data: { writeError: writeError ?? null, success: !writeError },
        timestamp: Date.now(),
        hypothesisId: "H5",
      }),
    }).catch(() => {});
    // #endregion
    if (writeError) {
      return NextResponse.json(
        { error: "Write failed", details: writeError },
        { status: 500 }
      );
    }
    const metaFile = files.find((f) => f.name === "meta.yaml");
    let type = "multiple_choice";
    let title: string | null = null;
    let domain: string | null = null;
    if (metaFile) {
      try {
        const meta = yaml.load(metaFile.content) as { type?: string; title?: string; domain?: string };
        if (meta?.type) type = meta.type;
        if (meta?.title != null) title = meta.title;
        if (meta?.domain != null) domain = meta.domain;
      } catch {
        // keep defaults
      }
    }
    const supabase = await createClient();
    const questionOwner = await getQuestionOwner(supabase, logicalId);
    const isNewQuestion = questionOwner == null;
    const isOwner = isNewQuestion || questionOwner === user.id;
    const storagePath = `${logicalId}/${version}`;
    const { error: dbError } = await insertQuestionVersion(supabase, {
      logical_id: logicalId,
      version,
      owner_id: isNewQuestion ? user.id : questionOwner!,
      type,
      title,
      domain,
      storage_path: storagePath,
      status: isOwner ? "approved" : "pending",
      proposed_by: isOwner ? null : user.id,
    });
    if (dbError) {
      // #region agent log
      fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "upload/route.ts:dbInsertFailed",
          message: "DB insert after write failed",
          data: { logicalId, version, error: (dbError as Error).message },
          timestamp: Date.now(),
          hypothesisId: "H2",
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json(
        { error: "Upload saved to storage but failed to record in database", details: (dbError as Error).message },
        { status: 500 }
      );
    }
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8ff7ff1e-218b-4b2b-b613-6784eb826cca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "upload/route.ts:success",
        message: "Upload success; DB insert done",
        data: { logicalId, version, userId: user.id },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
    // #endregion
    logQuestions("upload", user.id, {
      questionId: logicalId,
      version,
      fileCount: files.length,
    });
    return NextResponse.json({
      ok: true,
      logicalId,
      version,
      status: isOwner ? "approved" : "pending",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json(
      { error: "Unauthorized or upload failed" },
      { status: 401 }
    );
  }
}
