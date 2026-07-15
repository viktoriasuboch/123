import "server-only";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { DocumentReminder } from "@/lib/schemas";

const sb = () => createServerSupabase();

export async function listDocumentReminders(): Promise<DocumentReminder[]> {
  const { data, error } = await sb()
    .from("document_reminders")
    .select("*")
    .order("active", { ascending: false })
    .order("expected_day", { ascending: true });
  if (error) throw error;
  return z.array(DocumentReminder).parse(data ?? []);
}

/**
 * A reminder is OUTSTANDING for the current month when:
 *   - active,
 *   - the day-of-month expected has arrived (today's date-of-month >= expected_day), and
 *   - it hasn't been marked received in the current month.
 *
 * For non-recurring reminders, we treat any prior mark-as-received as
 * satisfying it permanently.
 */
export function isReminderOutstanding(
  r: DocumentReminder,
  today: Date = new Date(),
): boolean {
  if (r.active === false) return false;
  const todayDay = today.getDate();
  if (todayDay < r.expected_day) return false;

  if (!r.last_received_at) return true;

  if (r.recurring === false) return false;

  const lastRecv = new Date(r.last_received_at);
  // Same calendar month & year in the app's local timezone → satisfied
  // for this cycle. Next month it becomes outstanding again on
  // expected_day.
  return !(
    lastRecv.getFullYear() === today.getFullYear() &&
    lastRecv.getMonth() === today.getMonth()
  );
}
