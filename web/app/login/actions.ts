"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthServerSupabase } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth";

const EmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const OtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().trim().regex(/^\d{6}$/, "Код должен быть 6 цифр"),
});

export type EmailStepState = { email?: string; error?: string; sent?: boolean };

/**
 * Step 1: user submits email. If it's allowed, ask Supabase to send a
 * 6-digit OTP to that address. We do not create new auth users
 * automatically — only whitelisted addresses may sign up.
 */
export async function sendOtpAction(
  _prev: EmailStepState,
  formData: FormData,
): Promise<EmailStepState> {
  const parsed = EmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Некорректный email" };
  }
  const { email } = parsed.data;

  const allowed = await isEmailAllowed(email);
  if (!allowed) {
    return {
      email,
      error: "Этот адрес не в списке доступа",
    };
  }

  const sb = await createAuthServerSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // No emailRedirectTo — we want the 6-digit code path, not magic
      // links. When shouldCreateUser is true and the OTP is verified,
      // Supabase creates the user automatically.
    },
  });
  if (error) {
    console.error("signInWithOtp failed", error);
    return { email, error: "Не удалось отправить код. Попробуй ещё раз." };
  }
  return { email, sent: true };
}

export type OtpStepState = { email?: string; error?: string };

/**
 * Step 2: user submits the code they got by email. On success Supabase
 * stores the session cookie and we can redirect to the landing.
 */
export async function verifyOtpAction(
  _prev: OtpStepState,
  formData: FormData,
): Promise<OtpStepState> {
  const parsed = OtpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return {
      email: (formData.get("email") as string | null) ?? undefined,
      error:
        parsed.error.issues[0]?.message ??
        "Проверь код (6 цифр) и попробуй ещё раз",
    };
  }
  const { email, token } = parsed.data;

  const sb = await createAuthServerSupabase();
  const { error } = await sb.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) {
    console.error("verifyOtp failed", error);
    return {
      email,
      error: "Код не подошёл. Проверь или запроси новый.",
    };
  }
  redirect("/");
}
