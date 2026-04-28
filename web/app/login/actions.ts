"use server";

import argon2 from "argon2";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession, type SectionId } from "@/lib/session";

const Schema = z.object({
  section: z.enum(["leadgen", "projects"]),
  password: z.string().min(1).max(200),
});

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = Schema.safeParse({
    section: formData.get("section"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Некорректные данные" };

  const { section, password } = parsed.data;
  const hash = process.env[`SECTION_${section.toUpperCase()}_HASH`];
  if (!hash) {
    console.error(`Missing env: SECTION_${section.toUpperCase()}_HASH`);
    return { error: "Раздел не настроен" };
  }

  let ok = false;
  try {
    ok = await argon2.verify(hash, password);
  } catch (e) {
    console.error("argon2.verify failed", e);
    return { error: "Ошибка проверки" };
  }
  if (!ok) return { error: "Неверный пароль" };

  const session = await getSession();
  const next = new Set<SectionId>(session.sections ?? []);
  next.add(section);
  session.sections = [...next];
  await session.save();

  redirect(`/${section}`);
}
