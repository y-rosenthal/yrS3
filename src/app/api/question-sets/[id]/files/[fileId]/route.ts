import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import * as fileStorage from "@/lib/question-sets/file-storage";
import { reportError } from "@/lib/report";

/** GET: download an attached file. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    await requireUser();
    const { id: setId, fileId } = await params;
    const supabase = await createClient();

    const { data: row, error } = await supabase
      .from("question_set_files")
      .select("id, question_set_id, filename, stored_path")
      .eq("id", fileId)
      .eq("question_set_id", setId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const storedPath = (row as { stored_path: string }).stored_path;
    const filename = (row as { filename: string }).filename;
    const buffer = await fileStorage.readFile(storedPath);

    if (!buffer) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "GET /api/question-sets/[id]/files/[fileId]",
    });
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

/** DELETE: remove an attached file. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    await requireUser();
    const { id: setId, fileId } = await params;
    const supabase = await createClient();

    const { data: row, error: fetchError } = await supabase
      .from("question_set_files")
      .select("stored_path")
      .eq("id", fileId)
      .eq("question_set_id", setId)
      .maybeSingle();

    if (fetchError || !row) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const storedPath = (row as { stored_path: string }).stored_path;
    const { error: deleteError } = await supabase
      .from("question_set_files")
      .delete()
      .eq("id", fileId)
      .eq("question_set_id", setId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete file record" }, { status: 500 });
    }

    await fileStorage.deleteFile(storedPath);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "DELETE /api/question-sets/[id]/files/[fileId]",
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
