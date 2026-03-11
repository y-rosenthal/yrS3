import React from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getQuestionStore } from "@/lib/questions/get-store";
import { getLatestQuestionVersion } from "@/lib/questions/store-db";
import { CreateQuestionForm } from "../../new/create-question-form";
import { CreateBashForm } from "../../new/create-bash-form";
import { CreateBashPredictOutputForm } from "../../new/create-bash-predict-output-form";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ logicalId: string }> };

export default async function NewVersionPage({ params }: Props) {
  await requireUser();
  const { logicalId } = await params;
  const supabase = await createClient();
  const { data: row, error } = await getLatestQuestionVersion(supabase, logicalId);
  if (error || !row) notFound();
  const store = await getQuestionStore();
  const question = await store.get(logicalId, row.version);
  if (!question) notFound();

  const wrapper = (form: React.ReactNode) => (
    <div className="min-h-screen bg-zinc-50 px-[1em] py-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">New version</h1>
          <Link href="/questions" className="text-sm text-zinc-600 hover:underline">
            Back to my questions
          </Link>
        </div>
        <p className="mt-2 text-zinc-600">
          Current version: {row.version}. Edit below and choose how the version should bump. If you
          are not the question owner, your new version will be pending until they approve it.
        </p>
        <div className="mt-6">{form}</div>
      </div>
    </div>
  );

  if (question.type === "multiple_choice") {
    const initialData = {
      title: question.title,
      domain: question.domain,
      prompt: question.prompt,
      options: question.options?.map((o) => ({
        id: o.id,
        text: o.text,
        correct: o.id === question.correctId || o.correct === true,
      })),
    };
    return wrapper(
      <CreateQuestionForm
        logicalId={logicalId}
        versionBump
        initialData={initialData}
      />
    );
  }

  if (question.type === "bash") {
    const initialData = {
      title: question.title,
      domain: question.domain,
      prompt: question.prompt,
      solutionScript: question.solutionScript,
      tests: question.tests,
      sandboxZipRef: question.sandboxZipRef,
    };
    return wrapper(
      <CreateBashForm
        logicalId={logicalId}
        versionBump
        initialData={initialData}
      />
    );
  }

  if (question.type === "bash_predict_output") {
    const initialData = {
      title: question.title,
      domain: question.domain,
      prompt: question.prompt,
      scriptSource: question.scriptSource,
      expectedOutput: question.expected?.answer ?? "",
    };
    return wrapper(
      <CreateBashPredictOutputForm
        logicalId={logicalId}
        versionBump
        initialData={initialData}
      />
    );
  }

  notFound();
}
