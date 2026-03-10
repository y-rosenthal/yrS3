"use client";

import { useState } from "react";
import { CreateQuestionForm } from "./create-question-form";
import { CreateBashForm } from "./create-bash-form";
import { CreateBashPredictOutputForm } from "./create-bash-predict-output-form";

type QuestionType = "multiple_choice" | "bash" | "bash_predict_output";

type Props = {
  className?: string;
};

export function CreateQuestionByType({ className = "" }: Props) {
  const [questionType, setQuestionType] = useState<QuestionType>("multiple_choice");

  return (
    <div className={className}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 mb-2">Question type</label>
        <select
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value as QuestionType)}
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-800"
        >
          <option value="multiple_choice">Multiple choice</option>
          <option value="bash">Bash (write code — auto-check output)</option>
          <option value="bash_predict_output">Bash predict output (explain output, no terminal)</option>
        </select>
      </div>
      {questionType === "multiple_choice" && <CreateQuestionForm />}
      {questionType === "bash" && <CreateBashForm />}
      {questionType === "bash_predict_output" && <CreateBashPredictOutputForm />}
    </div>
  );
}
