import Link from "next/link";
import {
  listInvoiceTemplates,
  listInvoices,
  plannedMonthlyByProject,
  nextInvoiceNumbersByProject,
} from "@/lib/data/invoices";
import {
  listDocumentReminders,
  isReminderOutstanding,
} from "@/lib/data/document-reminders";
import { listProjects } from "@/lib/data/projects";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDate, monthlyReminderDue, dashboardPeriod } from "@/lib/calc";
import {
  InvoiceStatusBadge,
  effectiveStatus,
} from "@/components/invoices/invoice-status-badge";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import { InvoiceDialog } from "@/components/invoices/invoice-dialog";
import { DocumentReminderDialog } from "@/components/invoices/document-reminder-dialog";
import { DocumentReminderRowActions } from "@/components/invoices/document-reminder-row-actions";
import {
  ProjectsTab,
  type ProjectScope,
} from "@/components/invoices/projects-tab";
import { MonthYearFilter } from "@/components/invoices/month-year-filter";
import {
  TodayWidget,
  type TodayIssueItem,
  type TodayDocumentItem,
} from "@/components/invoices/today-widget";
import { InvoicesDashboard } from "@/components/invoices/invoices-dashboard";
import type { OverdueItem } from "@/components/invoices/overdue-list";
import {
  InvoicesCalendar,
  type CalendarView,
} from "@/components/invoices/invoices-calendar";
import type {
  Invoice,
  DocumentReminder,
  InvoiceTemplate,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Tab = "dashboard" | "calendar" | "all" | "projects";

type InvoiceScope = "invoices" | "hays";

type SP = Promise<{
  tab?: string;
  view?: string;
  anchor?: string;
  day?: string;
  scope?: string;
  issued_month?: string;
  year?: string;
  month?: string;
  period?: string;
  from?: string;
  to?: string;
}>;

const isHaysProject = (name: string) => /hays/i.test(name);
const yearMonth = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const knownTabs: Tab[] = ["dashboard", "calendar", "all", "projects"];
  // Legacy tab=documents redirects onto tab=all&scope=hays; the concepts
  // now live together on the "Все инвойсы" tab.
  const rawTab = sp.tab === "documents" ? "all" : sp.tab;
  const tab: Tab = (knownTabs.includes(rawTab as Tab) ? rawTab : "dashboard") as Tab;
  const calendarView: CalendarView = sp.view === "week" ? "week" : "month";
  const calendarAnchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.anchor ?? "")
    ? (sp.anchor as string)
    : new Date().toISOString().slice(0, 10);
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "")
    ? (sp.day as string)
    : undefined;
  const projectScope: ProjectScope = sp.scope === "hays" ? "hays" : "all";
  const invoiceScope: InvoiceScope =
    sp.scope === "hays" || sp.tab === "documents" ? "hays" : "invoices";
  // Year + month filter for "Все инвойсы". Defaults to the current
  // year, all months. Legacy `issued_month=YYYY-MM` maps onto both.
  let filterYear = /^\d{4}$/.test(sp.year ?? "")
    ? Number(sp.year)
    : new Date().getFullYear();
  let filterMonth = /^(0[1-9]|1[0-2])$/.test(sp.month ?? "")
    ? (sp.month as string)
    : "all";
  if (/^\d{4}-\d{2}$/.test(sp.issued_month ?? "")) {
    filterYear = Number(sp.issued_month!.slice(0, 4));
    filterMonth = sp.issued_month!.slice(5, 7);
  }

  const [templates, invoices, projects, reminders, plannedByProject, nextNumberByProject] =
    await Promise.all([
      listInvoiceTemplates(),
      listInvoices(),
      listProjects(),
      listDocumentReminders(),
      plannedMonthlyByProject(),
      nextInvoiceNumbersByProject(),
    ]);

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  // Two batched queries above replace the previous ~2 × projects.length
  // per-project queries. Projects with no numbered invoice fall back to
  // INV-001; projects with no active members fall back to 0.
  const projectOptions = projects.map((p) => ({
    id: p.id,
    name: p.name,
    planned_monthly: plannedByProject.get(p.id) ?? 0,
    next_invoice_number: nextNumberByProject.get(p.id) ?? "INV-001",
  }));

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // Build the "today" widget's three sections. Reminders stay on the
  // dashboard until the user marks them done for the current month —
  // we don't hide them just because the day has passed. A reminder is
  // only "overdue" (❗, negative daysUntil) when the template actually
  // existed before this month's issue day; otherwise it rolls forward
  // to next month. See monthlyReminderDue.
  const toIssue: TodayIssueItem[] = [];
  for (const t of templates) {
    if (t.active === false) continue;
    if (!t.issue_day) continue;
    if (isTemplateDoneThisMonth(t, today)) continue;
    const { daysUntil } = monthlyReminderDue(t.issue_day, t.created_at, today);
    toIssue.push({ kind: "template" as const, template: t, daysUntil });
  }
  // Missed ones first (most overdue at the top), then upcoming.
  toIssue.sort((a, b) => a.daysUntil - b.daysUntil);

  // Overdue is absolute ("as of today"), independent of the dashboard
  // period filter — it feeds the standalone overdue section + KPI.
  const overdue: OverdueItem[] = invoices
    .filter((inv) => effectiveStatus(inv, todayISO) === "overdue")
    .map((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : null;
      const daysLate = due
        ? Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400_000))
        : 0;
      return { invoice: inv, daysLate };
    })
    .sort((a, b) => b.daysLate - a.daysLate);

  const period = dashboardPeriod(sp.period, sp.from, sp.to, today);

  const documents: TodayDocumentItem[] = reminders
    .filter((r) => isReminderOutstanding(r, today))
    .map((r) => {
      const daysLate = Math.max(0, today.getDate() - r.expected_day);
      return { kind: "document" as const, reminder: r, daysLate };
    })
    .sort((a, b) => b.daysLate - a.daysLate);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-widest text-primary leading-none">
            INVOICES
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Трекер · К выставлению · Оплаты
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "all" && invoiceScope === "hays" ? (
            <DocumentReminderDialog
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
              trigger={
                <Button
                  size="sm"
                  className="font-mono text-[10px] uppercase tracking-[0.15em]"
                >
                  + Credit Note
                </Button>
              }
            />
          ) : tab === "calendar" ||
            tab === "dashboard" ||
            tab === "projects" ? null : (
            <InvoiceDialog
              projects={projectOptions}
              trigger={
                <Button
                  size="sm"
                  className="font-mono text-[10px] uppercase tracking-[0.15em]"
                >
                  + Инвойс
                </Button>
              }
            />
          )}
        </div>
      </div>

      {tab === "dashboard" ? (
        <div className="sticky top-0 z-20 -mx-1 px-1 pb-1 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TodayWidget
            toIssue={toIssue}
            documents={documents}
            projects={projectsById}
            projectOptions={projectOptions}
          />
        </div>
      ) : null}

      <TabsNav tab={tab} allCount={invoices.length + reminders.length} />

      {tab === "dashboard" ? (
        <InvoicesDashboard
          invoices={invoices}
          templates={templates}
          reminders={reminders}
          projects={projectsById}
          projectOptions={projectOptions}
          period={period}
          overdue={overdue}
        />
      ) : tab === "projects" ? (
        <ProjectsTab
          projectOptions={projectOptions}
          projects={projects}
          templatesByProject={groupBy(templates, (t) => t.project_id)}
          scope={projectScope}
        />
      ) : tab === "calendar" ? (
        <InvoicesCalendar
          view={calendarView}
          anchor={calendarAnchor}
          selectedDay={selectedDay}
          invoices={invoices}
          templates={templates}
          reminders={reminders}
          projects={projectsById}
          projectOptions={projectOptions}
        />
      ) : (
        <AllInvoicesTab
          invoices={invoices}
          reminders={reminders}
          projectsById={projectsById}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          projectOptions={projectOptions}
          scope={invoiceScope}
          year={filterYear}
          month={filterMonth}
        />
      )}
    </div>
  );
}

/* ─── tabs bar ────────────────────────────────────────────────────── */

function TabsNav({
  tab,
  allCount,
}: {
  tab: Tab;
  allCount: number;
}) {
  const items: {
    id: Tab;
    label: string;
    count: number | null;
  }[] = [
    { id: "dashboard", label: "Дашборд", count: null },
    { id: "calendar", label: "Календарь", count: null },
    { id: "projects", label: "Проекты", count: null },
    { id: "all", label: "Все инвойсы", count: allCount },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
      {items.map((it) => {
        const active = it.id === tab;
        return (
          <Link
            key={it.id}
            href={`/invoices?tab=${it.id}`}
            className={`px-3 py-2 -mb-px border-b-2 font-mono text-[10px] uppercase tracking-[0.15em] whitespace-nowrap transition ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {it.label}
            {it.count != null ? (
              <span className="opacity-60 ml-1">{it.count}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/* ─── all-invoices tab: switches + filter + forecast + tables ─────── */

function AllInvoicesTab({
  invoices,
  reminders,
  projectsById,
  projects,
  projectOptions,
  scope,
  year,
  month,
}: {
  invoices: Invoice[];
  reminders: DocumentReminder[];
  projectsById: Map<string, { id: string; name: string }>;
  projects: { id: string; name: string }[];
  projectOptions: import("@/components/invoices/invoice-template-dialog").ProjectOption[];
  scope: InvoiceScope;
  year: number;
  month: string; // "all" | "01".."12"
}) {
  // Non-HAYS invoices vs HAYS. HAYS = invoices for projects whose name
  // matches /hays/i. Credit-note reminders always live under the HAYS
  // switch.
  const projectsHaysMap = new Map<string, boolean>();
  projectsById.forEach((p, id) => projectsHaysMap.set(id, isHaysProject(p.name)));
  const nonHaysInvoices = invoices.filter(
    (i) => !projectsHaysMap.get(i.project_id),
  );
  const haysInvoices = invoices.filter((i) =>
    projectsHaysMap.get(i.project_id),
  );
  const inScope = scope === "hays" ? haysInvoices : nonHaysInvoices;

  const filteredInvoices = inScope.filter((inv) => {
    const ym = yearMonth(inv.issue_date);
    if (!ym) return false;
    if (Number(ym.slice(0, 4)) !== year) return false;
    if (month !== "all" && ym.slice(5, 7) !== month) return false;
    return true;
  });

  // Years present in the scope's data (desc); months present in the
  // selected year (asc) — drive the pill filter.
  const years = Array.from(
    new Set(
      inScope
        .map((i) => yearMonth(i.issue_date))
        .filter((m): m is string => !!m)
        .map((ym) => Number(ym.slice(0, 4))),
    ),
  ).sort((a, b) => b - a);
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => b - a);
  const months = Array.from(
    new Set(
      inScope
        .map((i) => yearMonth(i.issue_date))
        .filter((m): m is string => !!m && Number(m.slice(0, 4)) === year)
        .map((ym) => ym.slice(5, 7)),
    ),
  ).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <InvoiceScopeSwitches
          scope={scope}
          year={year}
          month={month}
          invoicesCount={nonHaysInvoices.length}
          haysInvoicesCount={haysInvoices.length + reminders.length}
        />
        <MonthYearFilter
          scope={scope}
          year={year}
          month={month}
          years={years}
          months={months}
        />
      </div>

      <StatusPipeline invoices={filteredInvoices} />

      <ForecastCards invoices={filteredInvoices} />

      {scope === "invoices" ? (
        <InvoicesTable
          invoices={filteredInvoices}
          projectsById={projectsById}
          projectOptions={projectOptions}
        />
      ) : (
        <>
          {filteredInvoices.length > 0 ? (
            <InvoicesTable
              invoices={filteredInvoices}
              projectsById={projectsById}
              projectOptions={projectOptions}
            />
          ) : null}
          <DocumentsTable
            reminders={reminders}
            projectsById={projectsById}
            projects={projects}
          />
        </>
      )}
    </div>
  );
}

function InvoiceScopeSwitches({
  scope,
  year,
  month,
  invoicesCount,
  haysInvoicesCount,
}: {
  scope: InvoiceScope;
  year: number;
  month: string;
  invoicesCount: number;
  haysInvoicesCount: number;
}) {
  const items: { id: InvoiceScope; label: string; count: number }[] = [
    { id: "invoices", label: "Инвойсы", count: invoicesCount },
    { id: "hays", label: "HAYS · Credit Notes", count: haysInvoicesCount },
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map((it) => {
        const active = it.id === scope;
        return (
          <Link
            key={it.id}
            href={`/invoices?tab=all&scope=${it.id}&year=${year}&month=${month}`}
            className={`px-3 py-1 rounded-md border font-mono text-[10px] uppercase tracking-[0.15em] transition ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
            }`}
          >
            {it.label}{" "}
            <span className="opacity-60 ml-1">{it.count}</span>
          </Link>
        );
      })}
    </div>
  );
}

const RU_MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function labelForMonth(ym: string): string {
  const [y, m] = ym.split("-").map((s) => parseInt(s, 10));
  return `${RU_MONTHS[m - 1]} ${y}`;
}

/**
 * Status pipeline — one segmented bar per currency splitting the
 * filtered volume into Оплачено / Ждём / Просрочено. Reads the state
 * of the money at a glance without mixing currencies.
 */
function StatusPipeline({ invoices }: { invoices: Invoice[] }) {
  const byCur = new Map<
    string,
    { paid: number; pending: number; overdue: number }
  >();
  for (const inv of invoices) {
    const s = effectiveStatus(inv);
    if (s === "cancelled") continue;
    const b = byCur.get(inv.currency) ?? { paid: 0, pending: 0, overdue: 0 };
    if (s === "paid") b.paid += inv.paid_amount ?? inv.amount;
    else if (s === "overdue") b.overdue += inv.amount;
    else b.pending += inv.amount;
    byCur.set(inv.currency, b);
  }
  const rows = [...byCur.entries()];
  if (rows.length === 0) return null;

  const fmt = (v: number) =>
    v.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div className="flex flex-wrap gap-4 text-[11px] font-mono text-muted-foreground">
        <Legend color="bg-good" label="Оплачено" />
        <Legend color="bg-sky-500" label="Ждём" />
        <Legend color="bg-destructive" label="Просрочено" />
      </div>
      {rows.map(([currency, b]) => {
        const total = b.paid + b.pending + b.overdue;
        const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
        return (
          <div key={currency} className="space-y-1">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-muted-foreground">{currency}</span>
              <span className="flex gap-3">
                <span className="text-good">{fmt(b.paid)}</span>
                <span className="text-sky-500">{fmt(b.pending)}</span>
                {b.overdue > 0 ? (
                  <span className="text-destructive">{fmt(b.overdue)}</span>
                ) : null}
              </span>
            </div>
            <div className="flex h-3.5 rounded-full overflow-hidden bg-muted">
              {b.paid > 0 ? (
                <div className="bg-good" style={{ width: `${pct(b.paid)}%` }} />
              ) : null}
              {b.pending > 0 ? (
                <div className="bg-sky-500" style={{ width: `${pct(b.pending)}%` }} />
              ) : null}
              {b.overdue > 0 ? (
                <div className="bg-destructive" style={{ width: `${pct(b.overdue)}%` }} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

/**
 * Stat cards for the filtered set: "Выставлено" (everything issued in
 * the filter) plus one "Получим · <месяц>" card per due-month of the
 * still-unpaid invoices. Each card lists per-currency amounts with a
 * thin bar whose width is scaled against the largest amount on screen,
 * so the relative weight reads at a glance.
 */
function ForecastCards({ invoices }: { invoices: Invoice[] }) {
  const issued: Record<string, number> = {};
  const byMonth: Map<string, Record<string, number>> = new Map();
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    issued[inv.currency] = (issued[inv.currency] ?? 0) + inv.amount;
    if (inv.status !== "paid" && inv.due_date) {
      const ym = yearMonth(inv.due_date);
      if (!ym) continue;
      const bucket = byMonth.get(ym) ?? {};
      bucket[inv.currency] = (bucket[inv.currency] ?? 0) + inv.amount;
      byMonth.set(ym, bucket);
    }
  }
  if (Object.keys(issued).length === 0) return null;

  const monthKeys = [...byMonth.keys()].sort();
  const maxVal = Math.max(
    ...Object.values(issued),
    ...[...byMonth.values()].flatMap((b) => Object.values(b)),
    1,
  );

  const cards: { title: string; accent: boolean; bucket: Record<string, number> }[] = [
    { title: "Выставлено", accent: false, bucket: issued },
    ...monthKeys.map((ym) => ({
      title: `Получим · ${labelForMonth(ym)}`,
      accent: true,
      bucket: byMonth.get(ym)!,
    })),
  ];

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.title} className="rounded-md border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            {c.title}
          </div>
          <div className="space-y-2">
            {Object.entries(c.bucket)
              .sort((a, b) => b[1] - a[1])
              .map(([currency, amount]) => (
                <div key={currency} className="space-y-1">
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-[10px] text-muted-foreground">
                      {currency}
                    </span>
                    <span
                      className={`text-lg ${c.accent ? "text-primary" : "text-foreground"}`}
                    >
                      {amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.accent ? "bg-primary" : "bg-foreground/50"}`}
                      style={{ width: `${Math.max(4, (amount / maxVal) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── invoices table ──────────────────────────────────────────────── */

function InvoicesTable({
  invoices,
  projectsById,
  projectOptions,
}: {
  invoices: Invoice[];
  projectsById: Map<string, { id: string; name: string }>;
  projectOptions: import("@/components/invoices/invoice-template-dialog").ProjectOption[];
}) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card py-16 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          Инвойсов пока нет — создай первый через «+ Инвойс» или заведи рекуррентный.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Номер / Проект
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Сумма
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Дата инвойса
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Оплатить до
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Статус
            </TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => {
            const s = effectiveStatus(inv);
            const project = projectsById.get(inv.project_id);
            return (
              <TableRow key={inv.id}>
                <TableCell>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      {inv.invoice_number ?? "—"}
                    </span>
                    <span className="font-medium">
                      {project?.name ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono">
                  {inv.currency} {formatAmount(inv.amount)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {fmtDate(inv.issue_date)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {inv.due_date ? (
                    <span
                      className={
                        s === "overdue"
                          ? "text-destructive font-medium"
                          : undefined
                      }
                    >
                      {fmtDate(inv.due_date)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge invoice={inv} />
                </TableCell>
                <TableCell className="text-right">
                  <InvoiceRowActions
                    invoice={inv}
                    projects={projectOptions}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────────── */

function isTemplateDoneThisMonth(
  t: InvoiceTemplate,
  today: Date,
): boolean {
  if (!t.last_issued_at) return false;
  const d = new Date(t.last_issued_at);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth()
  );
}

function groupBy<T, K>(arr: T[], key: (x: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/* ─── documents table ─────────────────────────────────────────────── */

function DocumentsTable({
  reminders,
  projectsById,
  projects,
}: {
  reminders: DocumentReminder[];
  projectsById: Map<string, { id: string; name: string }>;
  projects: { id: string; name: string }[];
}) {
  if (reminders.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card py-16 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          Credit notes ещё не отслеживаются. Пример: «Credit note от HAYS к 10-му числу».
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Что / Проект
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              К какому числу
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Повтор
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Последний раз получен
            </TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {reminders.map((r) => {
            const project = projectsById.get(r.project_id);
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{r.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {project?.name ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {r.expected_day}-го числа
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {r.recurring === false ? "Разово" : "Каждый месяц"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {fmtDate(r.last_received_at)}
                </TableCell>
                <TableCell className="text-right">
                  <DocumentReminderRowActions
                    reminder={r}
                    projects={projects}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function formatAmount(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
