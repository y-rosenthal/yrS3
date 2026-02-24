import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getQuestionStore } from "@/lib/questions/get-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getQuestionStore();
  const question = await store.get(id);
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(question);
}
