import "server-only";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  Invoice,
  InvoiceTemplate,
  ProjectMember,
} from "@/lib/schemas";

const sb = () => createServerSupabase();

/* ── reads: templates ─────────────────────────────────────────────── */

export async function listInvoiceTemplates(): Promise<InvoiceTemplate[]> {
  const { data, error } = await sb()
    .from("invoice_templates")
    .select("*")
    .order("active", { ascending: false })
    .order("next_issue_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return z.array(InvoiceTemplate).parse(data ?? []);
}

export async function getInvoiceTemplate(
  id: string,
): Promise<InvoiceTemplate | null> {
  const { data, error } = await sb()
    .from("invoice_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? InvoiceTemplate.parse(data) : null;
}

/* ── reads: invoices ──────────────────────────────────────────────── */

export async function listInvoices(): Promise<Invoice[]> {
  const { data, error } = await sb()
    .from("invoices")
    .select("*")
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("issue_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return z.array(Invoice).parse(data ?? []);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await sb()
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? Invoice.parse(data) : null;
}

/* ── derived: expected monthly billing per project ────────────────── */

/**
 * Sum of `sell_rate * hours_load` across the project's active members.
 * Used as the default amount when creating an invoice template for a
 * project — the user can then override in the form.
 */
export async function plannedMonthlyForProject(
  projectId: string,
): Promise<number> {
  const { data, error } = await sb()
    .from("project_members")
    .select("sell_rate, hours_load, is_active")
    .eq("project_id", projectId);
  if (error) throw error;
  const rows = z
    .array(
      ProjectMember.pick({
        sell_rate: true,
        hours_load: true,
        is_active: true,
      }),
    )
    .parse(data ?? []);
  return rows
    .filter((m) => m.is_active !== false)
    .reduce((sum, m) => sum + (m.sell_rate ?? 0) * (m.hours_load ?? 0), 0);
}
