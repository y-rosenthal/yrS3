import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMyQuestionsWithLatest } from "@/lib/questions/store-db";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { data, error } = await listMyQuestionsWithLatest(supabase, user.id);
    if (error) {
      return NextResponse.json({ error: "Failed to list questions" }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
