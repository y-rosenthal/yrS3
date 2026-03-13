import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/merge/facts
 * Merge two facts: surviving_id absorbs merged_id. All references (question_prerequisite_facts,
 * question_facts, tutorial_facts) are updated to surviving_id; merged fact is deleted; merge_logs entry created.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const supabase = createAdminClient();
    const body = await request.json();
    const { surviving_id, merged_id } = body;
    if (!surviving_id || !merged_id || surviving_id === merged_id) {
      return NextResponse.json(
        { error: "surviving_id and merged_id are required and must differ" },
        { status: 400 }
      );
    }

    await supabase
      .from("question_prerequisite_facts")
      .update({ fact_id: surviving_id })
      .eq("fact_id", merged_id);
    await supabase
      .from("question_facts")
      .update({ fact_id: surviving_id })
      .eq("fact_id", merged_id);
    await supabase
      .from("tutorial_facts")
      .update({ fact_id: surviving_id })
      .eq("fact_id", merged_id);

    const { error: delErr } = await supabase.from("facts").delete().eq("id", merged_id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const { error: logErr } = await supabase.from("merge_logs").insert({
      entity_type: "fact",
      surviving_id,
      merged_id,
      merged_by: user.id,
    });
    if (logErr) {
      return NextResponse.json({ error: logErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, surviving_id, merged_id });
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
