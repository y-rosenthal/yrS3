import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionVersion, approveVersion, isOwnerOfQuestion } from "@/lib/questions/store-db";
import { dualWriteToFs } from "@/lib/questions/dual-write";

/**
 * POST /api/questions/[id]/versions/[version]/approve
 * Owner only. Sets status to 'approved' for a pending version.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const user = await requireUser();
    const { id: logicalId, version } = await params;
    const supabase = await createClient();
    const isOwner = await isOwnerOfQuestion(supabase, logicalId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only the question owner can approve versions" },
        { status: 403 }
      );
    }
    const { data: row } = await getQuestionVersion(supabase, logicalId, version);
    if (!row) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    if (row.status !== "pending") {
      return NextResponse.json(
        { error: "Version is not pending (already approved or invalid)" },
        { status: 400 }
      );
    }
    const { error } = await approveVersion(supabase, logicalId, version, user.id);
    if (error) {
      return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
    }
    await dualWriteToFs({
      logicalId,
      version,
      dbRow: {
        owner_id: row.owner_id,
        status: "approved",
        proposed_by: row.proposed_by,
      },
    });
    return NextResponse.json({ ok: true, logicalId, version, status: "approved" });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized or request failed" }, { status: 401 });
  }
}
