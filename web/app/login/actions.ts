"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthServerSupabase } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth";

const CredsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginState = { email?: string; error?: string };

/**
 * Single-step password login. Two gates before Supabase:
 *   1. The email must be whitelisted in `allowed_users` (owner-only).
 *   2. Supabase checks the password against the stored bcrypt hash.
 * No email delivery is involved — users + passwords are provisioned by
 * the owner in the Supabase dashboard (Authentication → Users → Add user,
 * with "Auto Confirm User"). The role is still read by email in
 * `lib/auth.ts`, so admin / projects_viewer keep working unchanged.
 */
export async function signInAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = CredsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      email: (formData.get("email") as string | null) ?? undefined,
      error: parsed.error.issues[0]?.message ?? "Проверь email и пароль",
    };
  }
  const { email, password } = parsed.data;

  if (!(await isEmailAllowed(email))) {
    return { email, error: "Этот адрес не в списке доступа" };
  }

  const sb = await createAuthServerSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    // Deliberately vague — don't leak whether the email exists or the
    // password was wrong.
    return { email, error: "Неверный email или пароль" };
  }
  redirect("/");
}
