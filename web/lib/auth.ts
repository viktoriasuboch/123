import "server-only";
import { redirect } from "next/navigation";
import { createAuthServerSupabase, createServerSupabase } from "./supabase/server";

/**
 * The user we accept as authenticated. We only surface the subset of
 * `auth.users` fields we actually use on the app side.
 */
export type AuthUser = {
  id: string;
  email: string;
};

/**
 * Read the current user from the Supabase auth cookie. Returns null
 * if not signed in.
 */
export async function currentUser(): Promise<AuthUser | null> {
  const sb = await createAuthServerSupabase();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user || !data.user.email) return null;
  return { id: data.user.id, email: data.user.email };
}

/**
 * Require a signed-in user or redirect to /login. Use inside every
 * protected layout / page / server action.
 */
export async function requireUser(): Promise<AuthUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

/**
 * Check whether an email is allowed to sign in. Rules:
 *   1. Suffix match against the ALLOWED_DOMAINS env var
 *      (comma-separated, e.g. "interexy.com,partner.com").
 *   2. Exact match in the `allowed_users` table.
 *
 * Empty/missing ALLOWED_DOMAINS = no domain wildcarding, only the
 * per-email table applies.
 */
export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return false;

  const domains = (process.env.ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const suffix = normalized.split("@")[1];
  if (domains.some((d) => suffix === d)) return true;

  const admin = createServerSupabase();
  const { data } = await admin
    .from("allowed_users")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  return !!data;
}
