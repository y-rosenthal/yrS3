import { NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth";
import { getQuestionStore } from "@/lib/questions/get-store";
import { logAuthor } from "@/lib/logger";

export async function GET() {
  try {
    const user = await requireAuthor();
    const store = await getQuestionStore();
    const list = await store.list();
    logAuthor("metadata_list", user.id, { count: list.length });
    return NextResponse.json(list);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json(
      { error: "Unauthorized or failed to list questions" },
      { status: 401 }
    );
  }
}
