import "server-only";
import { listInvoices, listInvoiceTemplates } from "@/lib/data/invoices";
import {
  listDocumentReminders,
  isReminderOutstanding,
} from "@/lib/data/document-reminders";
import { listProjects } from "@/lib/data/projects";
import {
  monthlyReminderDue,
  intervalStepDays,
  amountOutstanding,
  fmtDate,
} from "@/lib/calc";
import { effectiveStatus } from "@/components/invoices/invoice-status-badge";
import type { InvoiceTemplate } from "@/lib/schemas";

/* Local date helpers — same shape used on the dashboard / project page. */
function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return localISO(d);
}
function weekendShiftISO(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return localISO(d);
}

function cadenceLabel(t: InvoiceTemplate): string {
  const freq = t.frequency ?? "monthly";
  if (freq === "weekly") return "каждую неделю";
  if (freq === "biweekly") return "каждые 2 недели";
  if (freq === "quarterly") return "раз в квартал";
  if (freq === "once") return "разово";
  return t.issue_day ? `каждое ${t.issue_day}-е число` : "каждый месяц";
}

function doneThisMonth(t: InvoiceTemplate, now: Date): boolean {
  if (!t.last_issued_at) return false;
  const d = new Date(t.last_issued_at);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export type ReminderDigest = {
  todayLabel: string;
  toIssue: { project: string; cadence: string; dueLabel: string; late: boolean }[];
  overdue: {
    project: string;
    number: string;
    amount: string;
    dueLabel: string;
    daysLate: number;
  }[];
  documents: { project: string; name: string; daysLate: number }[];
  isEmpty: boolean;
};

/**
 * The daily "нужно твоё внимание" set, mirroring the dashboard: invoices
 * to issue now (monthly reminders that came due + weekly/biweekly cycles
 * reached), overdue unpaid invoices, and outstanding credit-note
 * reminders. Interval cadences advance off the last issued invoice, so a
 * row disappears once you actually issue.
 */
export async function buildReminderDigest(now: Date): Promise<ReminderDigest> {
  const [invoices, templates, reminders, projects] = await Promise.all([
    listInvoices(),
    listInvoiceTemplates(),
    listDocumentReminders(),
    listProjects(),
  ]);

  const projName = new Map(projects.map((p) => [p.id, p.name]));
  const todayISO = localISO(now);

  const lastIssued = new Map<string, string>();
  for (const inv of invoices) {
    if (!inv.issue_date || effectiveStatus(inv) === "cancelled") continue;
    const iso = inv.issue_date.slice(0, 10);
    const prev = lastIssued.get(inv.project_id);
    if (!prev || iso > prev) lastIssued.set(inv.project_id, iso);
  }

  const toIssue: ReminderDigest["toIssue"] = [];
  for (const t of templates) {
    if (t.active === false) continue;
    const project = projName.get(t.project_id) ?? "—";
    const cadence = cadenceLabel(t);
    const step = intervalStepDays(t.frequency);
    if (step) {
      const li = lastIssued.get(t.project_id) ?? null;
      const raw = li ? addDaysISO(li, step) : t.next_issue_date ?? null;
      const nextISO = raw ? weekendShiftISO(raw) : null;
      if (!nextISO || nextISO > todayISO) continue;
      toIssue.push({ project, cadence, dueLabel: fmtDate(nextISO), late: nextISO < todayISO });
    } else if (t.issue_day) {
      if (doneThisMonth(t, now)) continue;
      const { dueISO, daysUntil, missed } = monthlyReminderDue(
        t.issue_day,
        t.created_at,
        now,
      );
      if (daysUntil > 0) continue;
      toIssue.push({ project, cadence, dueLabel: fmtDate(dueISO), late: missed });
    }
  }
  toIssue.sort((a, b) => Number(b.late) - Number(a.late));

  const overdue: ReminderDigest["overdue"] = invoices
    .filter((inv) => {
      if ((inv.status ?? "to_issue") === "cancelled") return false;
      if (!inv.due_date || inv.due_date.slice(0, 10) >= todayISO) return false;
      return amountOutstanding(inv) > 0;
    })
    .map((inv) => {
      const due = new Date(inv.due_date as string);
      const daysLate = Math.max(
        0,
        Math.floor((now.getTime() - due.getTime()) / 86400_000),
      );
      const outstanding = amountOutstanding(inv);
      const partial = outstanding < inv.amount;
      const amt = outstanding.toLocaleString("en-US", { maximumFractionDigits: 0 });
      return {
        project: projName.get(inv.project_id) ?? "—",
        number: inv.invoice_number ?? "—",
        amount: `${inv.currency} ${amt}${partial ? " (остаток)" : ""}`,
        dueLabel: fmtDate(inv.due_date),
        daysLate,
      };
    })
    .sort((a, b) => b.daysLate - a.daysLate);

  const documents: ReminderDigest["documents"] = reminders
    .filter((r) => isReminderOutstanding(r, now))
    .map((r) => ({
      project: projName.get(r.project_id) ?? "—",
      name: r.name,
      daysLate: Math.max(0, now.getDate() - r.expected_day),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  return {
    todayLabel: fmtDate(todayISO),
    toIssue,
    overdue,
    documents,
    isEmpty: toIssue.length === 0 && overdue.length === 0 && documents.length === 0,
  };
}

/* ─── HTML email (inline styles, light background for mail clients) ──── */

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );

function section(title: string, rows: string[], accent: string): string {
  if (rows.length === 0) return "";
  return `
    <tr><td style="padding:20px 24px 6px;">
      <div style="font:600 12px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${accent};">${esc(title)}</div>
    </td></tr>
    ${rows.map((r) => `<tr><td style="padding:6px 24px;">${r}</td></tr>`).join("")}`;
}

export function renderReminderEmail(d: ReminderDigest): {
  subject: string;
  html: string;
} {
  const subject = `Инвойсы на ${d.todayLabel} — ${d.toIssue.length} к выставлению, ${d.overdue.length} просрочено`;

  const line = (main: string, sub: string, danger = false) =>
    `<div style="font:400 15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;">${main}</div>
     <div style="font:400 12px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${danger ? "#c0392b" : "#777"};">${sub}</div>`;

  const issueRows = d.toIssue.map((it) =>
    line(esc(it.project), `${esc(it.cadence)} · выставить ${esc(it.dueLabel)}${it.late ? " · просрочено" : ""}`, it.late),
  );
  const overdueRows = d.overdue.map((it) =>
    line(`${esc(it.project)} · ${esc(it.number)}`, `${esc(it.amount)} · срок ${esc(it.dueLabel)} · ${it.daysLate} дн. просрочки`, true),
  );
  const docRows = d.documents.map((it) =>
    line(esc(it.project), `${esc(it.name)}${it.daysLate > 0 ? ` · ${it.daysLate} дн.` : ""}`, it.daysLate > 0),
  );

  const html = `<!doctype html>
<html><body style="margin:0;background:#f4f4f2;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e0;border-radius:12px;">
    <tr><td style="padding:24px 24px 4px;">
      <div style="font:700 20px/1.2 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;">Инвойсы — к действию</div>
      <div style="font:400 13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#777;">${esc(d.todayLabel)}</div>
    </td></tr>
    ${section("К выставлению", issueRows, "#1f7a4d")}
    ${section("Просрочено", overdueRows, "#c0392b")}
    ${section("Ждём документы", docRows, "#8a6d1f")}
    <tr><td style="padding:20px 24px 24px;">
      <a href="https://interexy.onrender.com/invoices" style="font:600 13px/1 -apple-system,Segoe UI,Roboto,sans-serif;color:#fff;background:#111;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block;">Открыть трекер</a>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}
