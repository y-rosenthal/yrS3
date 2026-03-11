/**
 * Default question sync owner for FS→DB import (SPEC 0.0.5).
 * Same UUID must be used in supabase/seed.sql.
 */

export const DEFAULT_QUESTION_SYNC_OWNER_ID =
  "00000000-0000-4000-8000-000000000001";

/**
 * Returns the sync owner ID: env override if set, otherwise the default seeded user.
 */
export function getSyncOwnerId(env?: NodeJS.ProcessEnv): string {
  const e = env ?? process.env;
  return e.QUESTION_SYNC_OWNER_ID ?? DEFAULT_QUESTION_SYNC_OWNER_ID;
}
