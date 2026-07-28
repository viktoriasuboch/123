import { buildReminderDigest, renderReminderEmail } from "@/lib/reminders";
import { sendEmail, reminderRecipients, reminderFrom } from "@/lib/email";

/**
 * Daily reminder digest, meant to be hit by an external scheduler (Render
 * Cron Job / cron-job.org) — Render's Web Service doesn't run cron itself.
 * Guarded by CRON_SECRET (Bearer header or ?secret=). `?dry=1` builds the
 * digest and reports counts without sending. Sends only when something is
 * actually due, so an empty day is a no-op, not spam.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not set" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : (url.searchParams.get("secret") ?? "");
  if (provided !== secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const digest = await buildReminderDigest(now);
  const counts = {
    toIssue: digest.toIssue.length,
    overdue: digest.overdue.length,
    documents: digest.documents.length,
  };

  if (digest.isEmpty) {
    return Response.json({ ok: true, sent: false, reason: "nothing due", counts });
  }
  if (url.searchParams.get("dry") === "1") {
    return Response.json({ ok: true, sent: false, reason: "dry-run", counts });
  }

  try {
    const to = reminderRecipients();
    const { subject, html } = renderReminderEmail(digest);
    const { id } = await sendEmail({ from: reminderFrom(), to, subject, html });
    return Response.json({ ok: true, sent: true, id, counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    return Response.json({ ok: false, sent: false, error: message, counts }, { status: 502 });
  }
}
