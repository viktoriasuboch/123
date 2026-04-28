import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service_role key.
 *
 * - Bypasses RLS — only call from Server Components, Server Actions,
 *   Route Handlers, or proxy.
 * - Recreated per request (no module-level caching) so request-scoped
 *   headers like x-real-ip don't leak across requests.
 */
export function createServerSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-source": "leadge-bonus-web" } },
  });
}
