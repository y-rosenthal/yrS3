import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  listTutorials,
  insertTutorial,
} from "@/lib/tutorials";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const supabase = await createClient();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);
    const { data, error } = await listTutorials(supabase, { limit, offset });
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
    const { title, external_ref, content_mode, stored_content_path } = body;
    const mode = content_mode ?? "direct";
    const validModes = ["direct", "pointer_only", "pointer_plus_full", "pointer_plus_excerpt"];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: `content_mode must be one of: ${validModes.join(", ")}` },
        { status: 400 }
      );
    }
    const { data, error } = await insertTutorial(supabase, {
      title: title ?? null,
      external_ref: external_ref ?? null,
      content_mode: mode,
      stored_content_path: stored_content_path ?? null,
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
