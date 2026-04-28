import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SectionId } from "./session";

/**
 * Throws (via redirect) if the visitor doesn't have a valid session entry for `section`.
 * Use inside protected layouts: `await requireSection("leadgen")`.
 */
export async function requireSection(section: SectionId) {
  const session = await getSession();
  if (!session.sections?.includes(section)) {
    redirect(`/login?section=${section}`);
  }
}

export async function hasSection(section: SectionId) {
  const session = await getSession();
  return session.sections?.includes(section) ?? false;
}
