import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getTutorialById,
  getTutorialFactIds,
  getTutorialTagPaths,
  updateTutorial,
  setTutorialFacts,
  setTutorialTagPaths,
  deleteTutorial,
} from "@/lib/tutorials";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const supabase = await createClient();
    const { id } = await params;
    const { data: tutorial, error } = await getTutorialById(supabase, id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!tutorial) {
      return NextResponse.json(null, { status: 404 });
    }
    const [factsRes, tagsRes] = await Promise.all([
      getTutorialFactIds(supabase, id),
      getTutorialTagPaths(supabase, id),
    ]);
    return NextResponse.json({
      ...tutorial,
      fact_ids: factsRes.data ?? [],
      tag_paths: tagsRes.data ?? [],
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();
    const { title, external_ref, content_mode, stored_content_path, fact_ids, tag_paths } = body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (external_ref !== undefined) updates.external_ref = external_ref;
    if (content_mode !== undefined) updates.content_mode = content_mode;
    if (stored_content_path !== undefined) updates.stored_content_path = stored_content_path;
    if (Object.keys(updates).length > 0) {
      const { error } = await updateTutorial(supabase, id, updates as Parameters<typeof updateTutorial>[2]);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    if (Array.isArray(fact_ids)) {
      const { error } = await setTutorialFacts(supabase, id, fact_ids);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    if (Array.isArray(tag_paths)) {
      const { error } = await setTutorialTagPaths(supabase, id, tag_paths);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    const { data } = await getTutorialById(supabase, id);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const supabase = await createClient();
    const { id } = await params;
    const { error } = await deleteTutorial(supabase, id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
