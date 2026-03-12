import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getQuestionSetById } from "@/lib/question-sets";
import * as fileStorage from "@/lib/question-sets/file-storage";
import { reportError } from "@/lib/report";

/** GET: list attached files for the question set (from full set payload). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const supabase = await createClient();
    const set = await getQuestionSetById(supabase, id);
    if (!set) {
      return NextResponse.json({ error: "Question set not found" }, { status: 404 });
    }
    return NextResponse.json(set.files ?? []);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "GET /api/question-sets/[id]/files",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/** POST: upload an attached file. FormData: file (File), description (optional string). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id: setId } = await params;
    const supabase = await createClient();
    const set = await getQuestionSetById(supabase, setId);
    if (!set) {
      return NextResponse.json({ error: "Question set not found" }, { status: 404 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const description = (formData.get("description") as string | null)?.trim() ?? null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Form field 'file' is required" },
        { status: 400 }
      );
    }

    const fileId = fileStorage.generateFileId();
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalFilename = file.name || "file";
    const storedPath = await fileStorage.saveFile(set.id, fileId, originalFilename, buffer);

    const { error } = await supabase.from("question_set_files").insert({
      id: fileId,
      question_set_id: set.id,
      filename: originalFilename,
      description,
      stored_path: storedPath,
    });

    if (error) {
      await fileStorage.deleteFile(storedPath);
      return NextResponse.json(
        { error: "Failed to record file in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: fileId,
      filename: originalFilename,
      description,
      storedPath,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "POST /api/question-sets/[id]/files",
    });
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
