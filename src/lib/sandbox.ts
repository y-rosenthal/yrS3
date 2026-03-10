/**
 * Sandbox interface for running user code (SPEC 6).
 * MVP: run bash with timeout; no network, no host filesystem.
 */

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut?: boolean;
}

export interface RunBashOptions {
  /** Working directory for the bash process (e.g. extracted zip root). */
  cwd?: string;
}

export interface SandboxRunner {
  runBash(
    code: string,
    stdin?: string,
    timeoutMs?: number,
    options?: RunBashOptions
  ): Promise<RunResult>;
  runR?(code: string, timeoutMs?: number): Promise<RunResult>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** Node-based bash runner for local dev. Uses child_process with timeout. */
export function createLocalBashRunner(): SandboxRunner {
  return {
    async runBash(
      code: string,
      stdin?: string,
      timeoutMs: number = DEFAULT_TIMEOUT_MS,
      options?: RunBashOptions
    ): Promise<RunResult> {
      const { spawn } = await import("child_process");
      const spawnOpts: { stdio: ("pipe")[]; env: NodeJS.ProcessEnv; cwd?: string } = {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PATH: "/usr/bin:/bin" },
      };
      if (options?.cwd) spawnOpts.cwd = options.cwd;
      return new Promise((resolve) => {
        const proc = spawn("bash", ["-c", code], spawnOpts);
        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (d) => (stdout += d.toString()));
        proc.stderr?.on("data", (d) => (stderr += d.toString()));
        const timer = setTimeout(() => {
          proc.kill("SIGKILL");
          resolve({
            stdout,
            stderr: stderr + "\n[Timed out]",
            exitCode: -1,
            timedOut: true,
          });
        }, timeoutMs);
        if (stdin) proc.stdin?.write(stdin);
        proc.stdin?.end();
        proc.on("close", (code) => {
          clearTimeout(timer);
          resolve({
            stdout,
            stderr,
            exitCode: code ?? -1,
          });
        });
        proc.on("error", (err) => {
          clearTimeout(timer);
          resolve({
            stdout,
            stderr: stderr + (err?.message ?? String(err)),
            exitCode: -1,
          });
        });
      });
    },
  };
}

let defaultRunner: SandboxRunner | null = null;

export function getSandboxRunner(): SandboxRunner {
  if (!defaultRunner) {
    defaultRunner = createLocalBashRunner();
  }
  return defaultRunner;
}
