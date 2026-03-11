/**
 * Extract a zip file to a temporary directory. Uses the system `unzip` command.
 * Returns the path to the extracted directory. Caller may remove it when done.
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function extractZipToTemp(zipPath: string): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yrs3-sandbox-"));
  try {
    await execFileAsync("unzip", ["-q", "-o", zipPath, "-d", tmpDir]);
    return tmpDir;
  } catch (err) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
