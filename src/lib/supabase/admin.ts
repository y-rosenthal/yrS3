/**
 * Supabase client with service role for server-side use without a request (e.g. startup sync).
 * Bypasses RLS; use only in trusted server contexts. Not for request-scoped auth.
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY) are required for admin client"
    );
  }
  return createClient(url, serviceRoleKey);
}
