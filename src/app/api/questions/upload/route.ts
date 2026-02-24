import { NextRequest, NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth";
import { getQuestionStore } from "@/lib/questions/get-store";
import { validateQuestionUpload } from "@/lib/questions/validate";
import { logAuthor } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthor();
    const formData = await request.formData();
    const folderName = formData.get("folderName") as string | null;
    const isModification = formData.get("isModification") === "true";
    if (!folderName?.trim()) {
      return NextResponse.json(
        { error: "folderName required" },
        { status: 400 }
      );
    }
    const files: { name: string; content: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "folderName" || key === "isModification") continue;
      if (value instanceof File) {
        const content = await value.text();
        files.push({ name: value.name || key, content });
      }
    }
    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one file required" },
        { status: 400 }
      );
    }
    const validation = validateQuestionUpload(folderName, files);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }
    const store = await getQuestionStore();
    if (isModification) {
      const exists = await store.has(folderName);
      if (!exists) {
        return NextResponse.json(
          { error: "Question not found for modification" },
          { status: 404 }
        );
      }
    }
    const writeError = await store.write(folderName, files, {
      isModification,
    });
    if (writeError) {
      return NextResponse.json(
        { error: "Write failed", details: writeError },
        { status: 500 }
      );
    }
    logAuthor("upload", user.id, {
      questionId: folderName,
      isModification,
      fileCount: files.length,
    });
    return NextResponse.json({ ok: true, id: folderName });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json(
      { error: "Unauthorized or upload failed" },
      { status: 401 }
    );
  }
}
