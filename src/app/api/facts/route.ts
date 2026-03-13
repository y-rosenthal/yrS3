import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  listFacts,
  getFactById,
  searchFactsByText,
  insertFact,
  updateFact,
} from "@/lib/facts";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const supabase = await createClient();
    const id = request.nextUrl.searchParams.get("id")?.trim();
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const tagPath = request.nextUrl.searchParams.get("tag_path")?.trim();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);

    if (id) {
      const { data, error } = await getFactById(supabase, id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data ?? null);
    }

    if (q) {
      const { data, error } = await searchFactsByText(supabase, q, { limit });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    const { data, error } = await listFacts(supabase, {
      tagPath: tagPath || undefined,
      limit,
      offset,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const supabase = await createClient();
    const body = await request.json();
    const { canonical_text, tag_path, subject, predicate, object } = body;
    if (!canonical_text || typeof canonical_text !== "string" || !canonical_text.trim()) {
      return NextResponse.json(
        { error: "canonical_text is required" },
        { status: 400 }
      );
    }
    const { data, error } = await insertFact(supabase, {
      canonical_text: canonical_text.trim(),
      tag_path: tag_path ?? null,
      subject: subject ?? null,
      predicate: predicate ?? null,
      object: object ?? null,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireUser();
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const { data, error } = await updateFact(supabase, id, updates);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
