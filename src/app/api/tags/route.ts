import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  listTags,
  getTagByPath,
  searchTagsByPathPrefix,
  insertTag,
} from "@/lib/tags";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const supabase = await createClient();
    const prefix = request.nextUrl.searchParams.get("prefix")?.trim();
    const pathParam = request.nextUrl.searchParams.get("path")?.trim();

    if (pathParam) {
      const { data, error } = await getTagByPath(supabase, pathParam);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data ?? null);
    }

    if (prefix) {
      const { data, error } = await searchTagsByPathPrefix(supabase, prefix);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    const { data, error } = await listTags(supabase);
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
    const { name, parent_id, path } = body;
    if (!path || typeof path !== "string" || !path.trim()) {
      return NextResponse.json(
        { error: "path is required (e.g. programming/python/if)" },
        { status: 400 }
      );
    }
    const pathTrimmed = path.trim();
    const nameVal =
      typeof name === "string" && name.trim() ? name.trim() : pathTrimmed.split("/").pop() ?? pathTrimmed;
    const { data, error } = await insertTag(supabase, {
      name: nameVal,
      parent_id: parent_id ?? null,
      path: pathTrimmed,
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
