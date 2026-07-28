import "server-only";
import { z } from "zod";

/**
 * Minimal Resend client over their REST API — no SDK dependency. Server
 * only; the key never reaches the browser. Callers pass an already-built
 * HTML body. Throws on a missing key or a non-2xx Resend response so the
 * caller can report it (the API key is never included in the error).
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const SendSchema = z.object({
  from: z.string().min(3),
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  html: z.string().min(1),
});

export type SendEmailInput = z.infer<typeof SendSchema>;

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const payload = SendSchema.parse(input);

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as { id: string };
}

/** Comma-separated recipient list from env → validated array. */
export function reminderRecipients(): string[] {
  const raw = process.env.REMINDER_TO ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return z.array(z.string().email()).parse(list);
}

/** Sender address; defaults to the (to-be-verified) interexy.com domain. */
export function reminderFrom(): string {
  return process.env.REMINDER_FROM || "Interexy Invoices <noreply@interexy.com>";
}
