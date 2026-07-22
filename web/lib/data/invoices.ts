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

/* ── next invoice number, scoped to a single project ─────────────── */

/**
 * Compute the next suggested invoice number for a project. Numbering
 * restarts per project — Project A and Project B can both hold
 * INV-005 for different invoices.
 *
 * Extracts the trailing integer from every existing invoice_number on
 * this project, takes the max, adds 1. The prefix + zero-pad width are
 * inherited from the latest existing number, so if the user started
 * with `INV-045` the next one is `INV-046`. If the project has no
 * numbered invoice yet we fall back to `INV-001`.
 */
export async function nextInvoiceNumberForProject(
  projectId: string,
): Promise<string> {
  const { data, error } = await sb()
    .from("invoices")
    .select("invoice_number")
    .eq("project_id", projectId)
    .not("invoice_number", "is", null);
  if (error) throw error;

  const numbers = (data ?? [])
    .map((r) => (r as { invoice_number: string | null }).invoice_number)
    .filter((s): s is string => !!s);

  if (numbers.length === 0) return "INV-001";

  // Prefer the format of the most-recent-looking entry; use the parse
  // helper to pull out prefix + numeric part.
  let bestPrefix = "INV-";
  let bestPad = 3;
  let maxN = 0;
  for (const s of numbers) {
    const m = s.match(/^(.*?)(\d+)\s*$/);
    if (!m) continue;
    const n = parseInt(m[2], 10);
    if (!Number.isFinite(n)) continue;
    if (n >= maxN) {
      maxN = n;
      bestPrefix = m[1];
      bestPad = Math.max(m[2].length, 3);
    }
  }
  const next = String(maxN + 1).padStart(bestPad, "0");
  return `${bestPrefix}${next}`;
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

/* ── batched variants — one query for the whole set ───────────────── */

const ProjectMemberSlice = ProjectMember.pick({
  project_id: true,
  sell_rate: true,
  hours_load: true,
  is_active: true,
});

/**
 * Same computation as `plannedMonthlyForProject`, but done in a single
 * `project_members` query and grouped in memory. Returns a map keyed by
 * project_id so callers avoid the N+1 pattern on the invoices page.
 * Projects with no active members are absent from the map (caller
 * defaults to 0).
 */
export async function plannedMonthlyByProject(): Promise<Map<string, number>> {
  const { data, error } = await sb()
    .from("project_members")
    .select("project_id, sell_rate, hours_load, is_active");
  if (error) throw error;
  const rows = z.array(ProjectMemberSlice).parse(data ?? []);
  const totals = new Map<string, number>();
  for (const m of rows) {
    if (m.is_active === false) continue;
    const add = (m.sell_rate ?? 0) * (m.hours_load ?? 0);
    if (add === 0) continue;
    totals.set(m.project_id, (totals.get(m.project_id) ?? 0) + add);
  }
  return totals;
}

const InvoiceNumberRow = z.object({
  project_id: z.string().uuid(),
  invoice_number: z.string().nullable(),
});

/**
 * Same logic as `nextInvoiceNumberForProject`, but done with one query
 * over `invoices` and grouped in memory. Returns a map keyed by
 * project_id. Projects with no numbered invoice yet are absent from
 * the map — callers should treat "missing" as `INV-001`.
 */
export async function nextInvoiceNumbersByProject(): Promise<
  Map<string, string>
> {
  const { data, error } = await sb()
    .from("invoices")
    .select("project_id, invoice_number")
    .not("invoice_number", "is", null);
  if (error) throw error;
  const rows = z.array(InvoiceNumberRow).parse(data ?? []);

  type Best = { prefix: string; pad: number; max: number };
  const perProject = new Map<string, Best>();
  for (const r of rows) {
    if (!r.invoice_number) continue;
    const m = r.invoice_number.match(/^(.*?)(\d+)\s*$/);
    if (!m) continue;
    const n = parseInt(m[2], 10);
    if (!Number.isFinite(n)) continue;
    const cur = perProject.get(r.project_id);
    if (!cur || n >= cur.max) {
      perProject.set(r.project_id, {
        prefix: m[1],
        pad: Math.max(m[2].length, 3),
        max: n,
      });
    }
  }

  const out = new Map<string, string>();
  for (const [projectId, best] of perProject) {
    const next = String(best.max + 1).padStart(best.pad, "0");
    out.set(projectId, `${best.prefix}${next}`);
  }
  return out;
}
