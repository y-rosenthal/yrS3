import { NextResponse } from "next/server";
import { getSyncStatus } from "@/lib/questions/sync-status";

/**
 * GET /api/sync-status
 * Returns the last startup or manual sync result. Unauthenticated so all users see the banner when there is a problem.
 */
export async function GET() {
  const status = getSyncStatus();
  return NextResponse.json(status);
}
