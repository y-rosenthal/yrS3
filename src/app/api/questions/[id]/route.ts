import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionStore } from "@/lib/questions/get-store";
import { getLatestQuestionVersion } from "@/lib/questions/store-db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: logicalId } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const versionParam = url.searchParams.get("version");
  let version: string;
  if (versionParam) {
    version = versionParam;
  } else {
    const supabase = await createClient();
    const { data: row, error } = await getLatestQuestionVersion(supabase, logicalId);
    if (error || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    version = row.version;
  }
  const store = await getQuestionStore();
  const question = await store.get(logicalId, version);
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(question);
}
