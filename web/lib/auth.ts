import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAuthServerSupabase, createServerSupabase } from "./supabase/server";

/** Access roles. `admin` = full access (default). `projects_viewer` =
 *  Projects section only, with sensitive aggregates hidden. */
export type AppRole = "admin" | "projects_viewer";

/**
 * The user we accept as authenticated. We only surface the subset of
 * `auth.users` fields we actually use on the app side, plus the app role.
 */
export type AuthUser = {
  id: string;
  email: string;
  role: AppRole;
};

// In-memory role cache (per server instance). Roles change only when the
// owner edits `allowed_users`, so a short TTL lets repeat navigations skip
// this DB round-trip while still picking up a change within a minute. This
// caches only the role tier, never access itself — `isEmailAllowed` stays
// uncached, so revoking access is immediate.
const roleCache = new Map<string, { role: AppRole; exp: number }>();
const ROLE_TTL_MS = 60_000;

/**
 * Look up a user's role from `allowed_users.role`. Any error — including
 * the column not existing yet (before the migration) — resolves to
 * `admin`, so the role system is inert until it's rolled out and nothing
 * breaks in the meantime.
 */
async function lookupRole(email: string): Promise<AppRole> {
  const key = email.trim().toLowerCase();
  const hit = roleCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.role;
  try {
    const admin = createServerSupabase();
    const { data, error } = await admin
      .from("allowed_users")
      .select("role")
      .eq("email", key)
      .maybeSingle();
    if (error) return "admin"; // transient failure — don't cache it
    const raw = (data as { role?: string | null } | null)?.role;
    const role: AppRole = raw === "projects_viewer" ? "projects_viewer" : "admin";
    roleCache.set(key, { role, exp: Date.now() + ROLE_TTL_MS });
    return role;
  } catch {
    return "admin";
  }
}

/**
 * Read the current user (+ role) from the Supabase auth cookie. Returns
 * null if not signed in. `cache`d so the auth check + role lookup run at
 * most once per request even though requireUser is called in many layers.
 */
export const currentUser = cache(async (): Promise<AuthUser | null> => {
  const sb = await createAuthServerSupabase();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user || !data.user.email) return null;
  const role = await lookupRole(data.user.email);
  return { id: data.user.id, email: data.user.email, role };
});

/** True for the full-access role. */
export function isAdmin(user: { role: AppRole } | null | undefined): boolean {
  return user?.role === "admin";
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
 * Require an admin. A signed-in non-admin (e.g. projects_viewer) is sent
 * back to /projects; a signed-out user goes to /login. Use to gate
 * admin-only sections such as Invoices.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/projects");
  return u;
}

/**
 * Check whether an email is allowed to sign in. Access is granted
 * *exclusively* by an exact row in the `allowed_users` table — being on
 * the company domain is not enough. That table is only editable via
 * service_role / the Supabase dashboard (there is no in-app UI to add
 * users), so access can be granted only by the owner. No env-based
 * domain wildcarding — that would let anyone on the domain in without
 * being explicitly listed.
 */
export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return false;

  const admin = createServerSupabase();
  const { data, error } = await admin
    .from("allowed_users")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  // A failed lookup is not "not whitelisted" — surface it so the login
  // form can report the service as unavailable instead of denying access.
  if (error) throw new Error(`allowed_users lookup failed: ${error.message}`);
  return !!data;
}
