"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  InvoiceTemplateInsert,
  InvoiceTemplateUpdate,
  InvoiceInsert,
  InvoiceUpdate,
  DocumentReminderInsert,
  DocumentReminderUpdate,
  Uuid,
} from "@/lib/schemas";
import { nextInvoiceNumberForProject } from "@/lib/data/invoices";

export async function suggestNextInvoiceNumber(
  projectId: string,
): Promise<string> {
  await requireUser();
  Uuid.parse(projectId);
  return nextInvoiceNumberForProject(projectId);
}

const sb = () => createServerSupabase();

const optStr = (v: FormDataEntryValue | null) => {
  const s = (v as string | null)?.trim();
  return s ? s : null;
};

const optNum = (v: FormDataEntryValue | null) => {
  const s = (v as string | null)?.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/* ─── templates ─────────────────────────────────────────────────────── */

export async function createInvoiceTemplate(formData: FormData) {
  await requireUser();
  const parsed = InvoiceTemplateInsert.safeParse({
    project_id: formData.get("project_id"),
    client_name: formData.get("client_name"),
    description: optStr(formData.get("description")),
    amount: formData.get("amount"),
    currency: (formData.get("currency") as string) || "USD",
    frequency: (formData.get("frequency") as string) || "monthly",
    issue_day: optNum(formData.get("issue_day")),
    payment_terms_days: formData.get("payment_terms_days") || 14,
    next_issue_date: optStr(formData.get("next_issue_date")),
    active: formData.get("active") !== "false",
    notes: optStr(formData.get("notes")),
  });
  if (!parsed.success) throw new Error("Invalid template data");

  const { error } = await sb().from("invoice_templates").insert(parsed.data);
  if (error) throw error;
  revalidatePath("/invoices");
}

export async function updateInvoiceTemplate(id: string, formData: FormData) {
  await requireUser();
  Uuid.parse(id);
  const parsed = InvoiceTemplateUpdate.safeParse({
    client_name: formData.get("client_name") ?? undefined,
    description: formData.has("description")
      ? optStr(formData.get("description"))
      : undefined,
    amount: formData.get("amount") ?? undefined,
    currency: formData.get("currency") ?? undefined,
    frequency: formData.get("frequency") ?? undefined,
    issue_day: formData.has("issue_day")
      ? optNum(formData.get("issue_day"))
      : undefined,
    payment_terms_days: formData.get("payment_terms_days") ?? undefined,
    next_issue_date: formData.has("next_issue_date")
      ? optStr(formData.get("next_issue_date"))
      : undefined,
    active:
      formData.has("active") ? formData.get("active") !== "false" : undefined,
    notes: formData.has("notes") ? optStr(formData.get("notes")) : undefined,
  });
  if (!parsed.success) throw new Error("Invalid template update");

  const { error } = await sb()
    .from("invoice_templates")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

export async function toggleInvoiceTemplateActive(id: string, active: boolean) {
  await requireUser();
  Uuid.parse(id);
  const { error } = await sb()
    .from("invoice_templates")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

export async function deleteInvoiceTemplate(id: string) {
  await requireUser();
  Uuid.parse(id);
  const { error } = await sb().from("invoice_templates").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

/* ─── invoices ──────────────────────────────────────────────────────── */

export async function createInvoice(formData: FormData) {
  await requireUser();
  const amount = formData.get("amount");
  const parsed = InvoiceInsert.safeParse({
    template_id: optStr(formData.get("template_id")),
    project_id: formData.get("project_id"),
    client_name: formData.get("client_name"),
    invoice_number: optStr(formData.get("invoice_number")),
    description: optStr(formData.get("description")),
    planned_amount: optNum(formData.get("planned_amount")),
    amount,
    currency: (formData.get("currency") as string) || "USD",
    status: (formData.get("status") as string) || "to_issue",
    scheduled_date: optStr(formData.get("scheduled_date")),
    issue_date: optStr(formData.get("issue_date")),
    due_date: optStr(formData.get("due_date")),
    paid_date: optStr(formData.get("paid_date")),
    paid_amount: optNum(formData.get("paid_amount")),
    notes: optStr(formData.get("notes")),
  });
  if (!parsed.success) throw new Error("Invalid invoice data");

  const { error } = await sb().from("invoices").insert(parsed.data);
  if (error) throw error;

  // If the invoice was created off a reminder, mark the reminder as
  // done for the current cycle so it stops showing on the dashboard.
  if (parsed.data.template_id) {
    await sb()
      .from("invoice_templates")
      .update({ last_issued_at: new Date().toISOString() })
      .eq("id", parsed.data.template_id);
  }

  revalidatePath("/invoices");
}

export async function markInvoiceTemplateDone(id: string) {
  await requireUser();
  Uuid.parse(id);
  const { error } = await sb()
    .from("invoice_templates")
    .update({ last_issued_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

/** Clear "done" flag so the reminder resurfaces on the dashboard. */
export async function undoInvoiceTemplateDone(id: string) {
  await requireUser();
  Uuid.parse(id);
  const { error } = await sb()
    .from("invoice_templates")
    .update({ last_issued_at: null })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
  await requireUser();
  Uuid.parse(id);
  const parsed = InvoiceUpdate.safeParse({
    client_name: formData.get("client_name") ?? undefined,
    invoice_number: formData.has("invoice_number")
      ? optStr(formData.get("invoice_number"))
      : undefined,
    description: formData.has("description")
      ? optStr(formData.get("description"))
      : undefined,
    amount: formData.get("amount") ?? undefined,
    currency: formData.get("currency") ?? undefined,
    scheduled_date: formData.has("scheduled_date")
      ? optStr(formData.get("scheduled_date"))
      : undefined,
    issue_date: formData.has("issue_date")
      ? optStr(formData.get("issue_date"))
      : undefined,
    due_date: formData.has("due_date")
      ? optStr(formData.get("due_date"))
      : undefined,
    paid_date: formData.has("paid_date")
      ? optStr(formData.get("paid_date"))
      : undefined,
    paid_amount: formData.has("paid_amount")
      ? optNum(formData.get("paid_amount"))
      : undefined,
    notes: formData.has("notes") ? optStr(formData.get("notes")) : undefined,
  });
  if (!parsed.success) throw new Error("Invalid invoice update");

  const { error } = await sb()
    .from("invoices")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

/**
 * Mark a `to_issue` invoice as `issued`. Sets issue_date (defaults to
 * today), computes due_date if a payment_terms_days is provided,
 * lets the user override the amount at this point.
 */
export async function markInvoiceIssued(id: string, formData: FormData) {
  await requireUser();
  Uuid.parse(id);
  const today = new Date().toISOString().slice(0, 10);
  const issueDate = optStr(formData.get("issue_date")) ?? today;
  const dueDate = optStr(formData.get("due_date")); // required from the form
  if (!dueDate) throw new Error("due_date is required");
  const amount = optNum(formData.get("amount"));
  const invoiceNumber = optStr(formData.get("invoice_number"));

  const patch: Record<string, unknown> = {
    status: "issued",
    issue_date: issueDate,
    due_date: dueDate,
  };
  if (amount !== null) patch.amount = amount;
  if (invoiceNumber !== null) patch.invoice_number = invoiceNumber;

  const { error } = await sb()
    .from("invoices")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

/**
 * Mark an `issued` invoice as `paid`. paid_date defaults to today,
 * paid_amount defaults to the invoice amount.
 */
export async function markInvoicePaid(id: string, formData: FormData) {
  await requireUser();
  Uuid.parse(id);
  const today = new Date().toISOString().slice(0, 10);
  const paidDate = optStr(formData.get("paid_date")) ?? today;
  const paidAmount = optNum(formData.get("paid_amount"));

  const patch: Record<string, unknown> = {
    status: "paid",
    paid_date: paidDate,
  };
  if (paidAmount !== null) patch.paid_amount = paidAmount;

  const { error } = await sb()
    .from("invoices")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

export async function cancelInvoice(id: string) {
  await requireUser();
  Uuid.parse(id);
  const { error } = await sb()
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

export async function deleteInvoice(id: string) {
  await requireUser();
  Uuid.parse(id);
  const { error } = await sb().from("invoices").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

/* ─── document reminders ────────────────────────────────────────────── */

export async function createDocumentReminder(formData: FormData) {
  await requireUser();
  const parsed = DocumentReminderInsert.safeParse({
    project_id: formData.get("project_id"),
    name: formData.get("name"),
    description: optStr(formData.get("description")),
    expected_day: formData.get("expected_day"),
    recurring: formData.get("recurring") !== "false",
    active: formData.get("active") !== "false",
    notes: optStr(formData.get("notes")),
  });
  if (!parsed.success) throw new Error("Invalid reminder data");

  const { error } = await sb().from("document_reminders").insert(parsed.data);
  if (error) throw error;
  revalidatePath("/invoices");
  revalidatePath(`/projects/${parsed.data.project_id}`);
}

export async function updateDocumentReminder(id: string, formData: FormData) {
  await requireUser();
  Uuid.parse(id);
  const parsed = DocumentReminderUpdate.safeParse({
    name: formData.get("name") ?? undefined,
    description: formData.has("description")
      ? optStr(formData.get("description"))
      : undefined,
    expected_day: formData.get("expected_day") ?? undefined,
    recurring:
      formData.has("recurring") ? formData.get("recurring") !== "false" : undefined,
    active:
      formData.has("active") ? formData.get("active") !== "false" : undefined,
    notes: formData.has("notes") ? optStr(formData.get("notes")) : undefined,
  });
  if (!parsed.success) throw new Error("Invalid reminder update");

  const { error } = await sb()
    .from("document_reminders")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

/**
 * Mark a reminder as received. For recurring reminders this bumps
 * last_received_at to now — the reminder will re-emerge next month.
 * For one-shot reminders the same field acts as a permanent "done".
 */
export async function markDocumentReminderReceived(id: string) {
  await requireUser();
  Uuid.parse(id);
  const { error } = await sb()
    .from("document_reminders")
    .update({ last_received_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}

export async function deleteDocumentReminder(id: string) {
  await requireUser();
  Uuid.parse(id);
  const { error } = await sb()
    .from("document_reminders")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
}
