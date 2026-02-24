import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSandboxRunner } from "@/lib/sandbox";
import { logStudent } from "@/lib/logger";
import { logSandbox } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  const body = await request.json();
  const { code, stdin, language } = body as {
    code?: string;
    stdin?: string;
    language?: string;
  };
  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { error: "code string required" },
      { status: 400 }
    );
  }
  if (language !== "bash" && language !== "sh") {
    return NextResponse.json(
      { error: "Only bash is supported in MVP" },
      { status: 400 }
    );
  }
  const runner = getSandboxRunner();
  logStudent("code_run", user.id, { language, codeLength: code.length });
  const result = await runner.runBash(code, stdin ?? "", 5000);
  logSandbox({
    userId: user.id,
    codeLength: code.length,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
  });
  return NextResponse.json({
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timedOut: result.timedOut ?? false,
  });
}
