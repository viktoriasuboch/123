import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * Admin server client using the service_role key.
 *
 * - Bypasses RLS — only call from Server Components, Server Actions,
 *   Route Handlers, or proxy.
 * - Recreated per request (no module-level caching) so request-scoped
 *   headers like x-real-ip don't leak across requests.
 * - Do NOT use for auth (getUser/signIn/etc.) — this client isn't wired
 *   to the auth cookie. Use createAuthServerSupabase for that.
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

/**
 * Auth-aware server client using the anon key + the request's cookie
 * jar. Use this to read the signed-in user (`.auth.getUser()`),
 * kick off email OTP flows (`.auth.signInWithOtp`), and sign out.
 * Cookie writes update the browser's Supabase session cookies.
 */
export async function createAuthServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — writes aren't
          // allowed there. Next.js re-fetches on navigation, so the
          // cookie mutation is deferred to the next Server Action or
          // Route Handler.
        }
      },
    },
  });
}
