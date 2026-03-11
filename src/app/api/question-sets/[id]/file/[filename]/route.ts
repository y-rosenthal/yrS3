import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getQuestionSetById } from "@/lib/question-sets";
import { getQuestionSetFolderPath } from "@/lib/question-sets/load-fs";
import fs from "fs/promises";
import path from "path";
import { reportError } from "@/lib/report";

/** GET: download an attached file for a file-based question set (files live in set folder). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    await requireUser();
    const { id: setId, filename } = await params;
    const supabase = await createClient();
    const set = await getQuestionSetById(supabase, setId);
    if (!set) {
      return NextResponse.json({ error: "Question set not found" }, { status: 404 });
    }
    if (set.source !== "file") {
      return NextResponse.json(
        { error: "Use the standard file download for database-backed sets" },
        { status: 400 }
      );
    }
    const file = set.files?.find(
      (f) => f.filename === filename || decodeURIComponent(filename) === f.filename
    );
    if (!file) {
      return NextResponse.json({ error: "File not found in this set" }, { status: 404 });
    }
    const folderPath = getQuestionSetFolderPath(setId);
    const safeName = path.basename(file.filename);
    const filePath = path.join(folderPath, "files", safeName);
    const buffer = await fs.readFile(filePath).catch(() => null);
    if (!buffer) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName.replace(/"/g, '\\"')}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    reportError(e instanceof Error ? e : new Error(String(e)), {
      route: "GET /api/question-sets/[id]/file/[filename]",
    });
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
