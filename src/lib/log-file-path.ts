/**
 * Shared log file path for report (write) and system-messages (read older).
 * Avoids circular dependency between report.ts and system-messages.ts.
 */
import path from "path";

const DEFAULT_LOG_PATH = "logs/app.log";

export function getLogFilePath(): string {
  const envPath = process.env.LOG_FILE_PATH;
  if (envPath)
    return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  return path.join(process.cwd(), DEFAULT_LOG_PATH);
}
