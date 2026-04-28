"use client";

import { createBrowserClient, type CookieMethodsBrowser } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Browser-side Supabase client used only for Realtime subscriptions.
 *
 * Writes must go through Server Actions (which use the service_role
 * key on the server). The anon key here is intentionally public.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  // Realtime-only client — we don't need full auth cookie handling.
  const cookieMethods: CookieMethodsBrowser = {
    getAll: () => [],
    setAll: () => {},
  };
  cached = createBrowserClient(url, key, { cookies: cookieMethods });
  return cached;
}
