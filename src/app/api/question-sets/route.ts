import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { listQuestionSets, insertQuestionSet } from "@/lib/question-sets";

export async function GET() {
  try {
    await requireUser();
    const supabase = await createClient();
    const sets = await listQuestionSets(supabase);
    return NextResponse.json(sets);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { title, description, questionLogicalIds } = body as {
      title?: string;
      description?: string;
      questionLogicalIds?: string[];
    };
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }
    const ids = Array.isArray(questionLogicalIds)
      ? questionLogicalIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    const supabase = await createClient();
    const set = await insertQuestionSet(supabase, {
      title: title.trim(),
      description: description?.trim() ?? null,
      questionLogicalIds: ids,
      ownerId: user.id,
    });
    if (!set) {
      return NextResponse.json({ error: "Failed to create question set" }, { status: 500 });
    }
    return NextResponse.json(set);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized or request failed" }, { status: 401 });
  }
}
