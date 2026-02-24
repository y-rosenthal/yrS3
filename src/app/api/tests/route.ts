import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getTestsConfig } from "@/lib/tests-config";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tests = getTestsConfig();
  return NextResponse.json(tests);
}
