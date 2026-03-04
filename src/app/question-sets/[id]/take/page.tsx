import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionSetById } from "@/lib/question-sets";
import { notFound } from "next/navigation";
import { TakeSetClient } from "./take-set-client";

export default async function TakeQuestionSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const set = await getQuestionSetById(supabase, id);
  if (!set) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <TakeSetClient setId={set.id} title={set.title} />
    </div>
  );
}
