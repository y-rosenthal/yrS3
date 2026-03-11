import { NextRequest, NextResponse } from "next/server";
import {
  getSystemMessages,
  getOlderMessages,
} from "@/lib/system-messages";
import type { MessageLevel } from "@/lib/system-messages";

/**
 * GET /api/logs
 * Returns system messages. Query params:
 * - level (optional, comma-separated, e.g. ?level=error,warning)
 * - older_than_id (optional): load next batch of older messages than this id; returns { messages, hasMore }
 */
export async function GET(request: NextRequest) {
  const levelParam = request.nextUrl.searchParams.get("level");
  const olderThanId = request.nextUrl.searchParams.get("older_than_id");
  const levels: MessageLevel[] | undefined = levelParam
    ? (levelParam.split(",").map((s) => s.trim()) as MessageLevel[]).filter(
        (l) => ["error", "warning", "info", "debug"].includes(l)
      )
    : undefined;
  const levelFilter = levels?.length ? levels : undefined;

  if (olderThanId?.trim()) {
    const { messages: older, hasMore } = await getOlderMessages(
      olderThanId.trim(),
      levelFilter
    );
    return NextResponse.json({ messages: older, hasMore });
  }

  const messages = getSystemMessages(levelFilter);
  return NextResponse.json({ messages });
}
