import { requireUser } from "@/lib/auth";
import { getTestById } from "@/lib/tests-config";
import { notFound } from "next/navigation";
import { TakeTestClient } from "./take-test-client";

export default async function TakeTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const test = getTestById(id);
  if (!test) notFound();
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <TakeTestClient test={test} />
    </div>
  );
}
