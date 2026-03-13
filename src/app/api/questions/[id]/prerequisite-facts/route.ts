import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionVersion } from "@/lib/questions/store-db";
import {
  getPrerequisiteFactIdsForQuestion,
  setPrerequisiteFactsForQuestion,
} from "@/lib/facts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const supabase = await createClient();
    const { id: logicalId } = await params;
    const version = request.nextUrl.searchParams.get("version")?.trim();
    if (!version) {
      return NextResponse.json(
        { error: "version query param is required" },
        { status: 400 }
      );
    }
    const { data: row, error } = await getQuestionVersion(supabase, logicalId, version);
    if (error || !row) {
      return NextResponse.json({ error: "Question version not found" }, { status: 404 });
    }
    const { data, error: factsErr } = await getPrerequisiteFactIdsForQuestion(supabase, row.id);
    if (factsErr) {
      return NextResponse.json({ error: factsErr.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const supabase = await createClient();
    const { id: logicalId } = await params;
    const version = request.nextUrl.searchParams.get("version")?.trim();
    if (!version) {
      return NextResponse.json(
        { error: "version query param is required" },
        { status: 400 }
      );
    }
    const { data: row, error } = await getQuestionVersion(supabase, logicalId, version);
    if (error || !row) {
      return NextResponse.json({ error: "Question version not found" }, { status: 404 });
    }
    const body = await request.json();
    const factIds = Array.isArray(body.fact_ids) ? body.fact_ids : [];
    if (!factIds.every((x: unknown) => typeof x === "string")) {
      return NextResponse.json(
        { error: "fact_ids must be an array of strings" },
        { status: 400 }
      );
    }
    const { error: setErr } = await setPrerequisiteFactsForQuestion(
      supabase,
      row.id,
      factIds
    );
    if (setErr) {
      return NextResponse.json({ error: setErr.message }, { status: 500 });
    }
    return NextResponse.json({ fact_ids: factIds });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
