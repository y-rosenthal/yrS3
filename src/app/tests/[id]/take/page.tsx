import { redirect } from "next/navigation";

/** Redirect legacy /tests/[id]/take to question-sets take. */
export default async function TestsTakeRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/question-sets/${encodeURIComponent(id)}/take`);
}
