import Link from "next/link";
import {
  listInvoiceTemplates,
  listInvoices,
  plannedMonthlyForProject,
  nextInvoiceNumberForProject,
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
import {
  InvoiceStatusBadge,
  effectiveStatus,
} from "@/components/invoices/invoice-status-badge";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import { TemplateRowActions } from "@/components/invoices/template-row-actions";
import { InvoiceTemplateDialog } from "@/components/invoices/invoice-template-dialog";
import { InvoiceDialog } from "@/components/invoices/invoice-dialog";
import { DocumentReminderDialog } from "@/components/invoices/document-reminder-dialog";
import { DocumentReminderRowActions } from "@/components/invoices/document-reminder-row-actions";
import {
  TodayWidget,
  type TodayIssueItem,
  type TodayOverdueItem,
  type TodayDocumentItem,
} from "@/components/invoices/today-widget";
import { InvoicesDashboard } from "@/components/invoices/invoices-dashboard";
import { InvoicesCalendar } from "@/components/invoices/invoices-calendar";
import type {
  Invoice,
  InvoiceTemplate,
  DocumentReminder,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Tab = "dashboard" | "calendar" | "all" | "recurring" | "documents";

type SP = Promise<{ tab?: string; month?: string; day?: string }>;

const FREQ_LABELS: Record<string, string> = {
  monthly: "Ежемесячно",
  quarterly: "Раз в квартал",
  once: "Разово",
};

const ISSUE_WINDOW_DAYS = 7;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const knownTabs: Tab[] = ["dashboard", "calendar", "all", "recurring", "documents"];
  const tab: Tab = (knownTabs.includes(sp.tab as Tab) ? sp.tab : "dashboard") as Tab;
  const todayMonthISO = new Date().toISOString().slice(0, 7);
  const monthISO = /^\d{4}-\d{2}$/.test(sp.month ?? "")
    ? (sp.month as string)
    : todayMonthISO;
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "")
    ? (sp.day as string)
    : undefined;

  const [templates, invoices, projects, reminders] = await Promise.all([
    listInvoiceTemplates(),
    listInvoices(),
    listProjects(),
    listDocumentReminders(),
  ]);

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  // Preload per-project: planned monthly billing + suggested next number.
  const projectMeta = await Promise.all(
    projects.map(async (p) => {
      const [planned, nextNumber] = await Promise.all([
        plannedMonthlyForProject(p.id),
        nextInvoiceNumberForProject(p.id),
      ]);
      return {
        id: p.id,
        name: p.name,
        planned_monthly: planned,
        next_invoice_number: nextNumber,
      };
    }),
  );
  const projectOptions = projectMeta;

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // Build the "today" widget's three sections.
  const toIssue: TodayIssueItem[] = [];
  for (const t of templates) {
    if (t.active === false) continue;
    const day = t.issue_day ?? null;
    if (!day) continue;
    // Days until the next occurrence of `day` in this or next month.
    // If today >= day: it's this month, already due (daysUntil negative).
    // If today < day: it's coming up this month.
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
    const diffDays = Math.round(
      (thisMonth.getTime() - today.getTime()) / 86400_000,
    );
    if (diffDays <= ISSUE_WINDOW_DAYS && diffDays >= -3) {
      toIssue.push({ kind: "template" as const, template: t, daysUntil: diffDays });
    }
  }
  toIssue.sort((a, b) => a.daysUntil - b.daysUntil);

  const overdue: TodayOverdueItem[] = invoices
    .filter((inv) => effectiveStatus(inv, todayISO) === "overdue")
    .map((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : null;
      const daysLate = due
        ? Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400_000))
        : 0;
      return { kind: "overdue" as const, invoice: inv, daysLate };
    })
    .sort((a, b) => b.daysLate - a.daysLate);

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
          {tab === "recurring" ? (
            <InvoiceTemplateDialog
              projects={projectOptions}
              trigger={
                <Button
                  size="sm"
                  className="font-mono text-[10px] uppercase tracking-[0.15em]"
                >
                  + Напоминалка
                </Button>
              }
            />
          ) : tab === "documents" ? (
            <DocumentReminderDialog
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
              trigger={
                <Button
                  size="sm"
                  className="font-mono text-[10px] uppercase tracking-[0.15em]"
                >
                  + Документ
                </Button>
              }
            />
          ) : tab === "calendar" || tab === "dashboard" ? null : (
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
        <TodayWidget
          toIssue={toIssue}
          overdue={overdue}
          documents={documents}
          projects={projectsById}
          projectOptions={projectOptions}
        />
      ) : null}

      <TabsNav
        tab={tab}
        allCount={invoices.length}
        recCount={templates.length}
        docCount={reminders.length}
      />

      {tab === "dashboard" ? (
        <InvoicesDashboard
          invoices={invoices}
          templates={templates}
          reminders={reminders}
          projects={projectsById}
        />
      ) : tab === "calendar" ? (
        <InvoicesCalendar
          monthISO={monthISO}
          selectedDay={selectedDay}
          invoices={invoices}
          templates={templates}
          reminders={reminders}
          projects={projectsById}
        />
      ) : tab === "recurring" ? (
        <TemplatesTable
          templates={templates}
          projectsById={projectsById}
          projectOptions={projectOptions}
        />
      ) : tab === "documents" ? (
        <DocumentsTable
          reminders={reminders}
          projectsById={projectsById}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      ) : (
        <InvoicesTable
          invoices={invoices}
          projectsById={projectsById}
          projectOptions={projectOptions}
        />
      )}
    </div>
  );
}

/* ─── tabs bar ────────────────────────────────────────────────────── */

function TabsNav({
  tab,
  allCount,
  recCount,
  docCount,
}: {
  tab: Tab;
  allCount: number;
  recCount: number;
  docCount: number;
}) {
  const items: {
    id: Tab;
    label: string;
    count: number | null;
  }[] = [
    { id: "dashboard", label: "Дашборд", count: null },
    { id: "calendar", label: "Календарь", count: null },
    { id: "all", label: "Все инвойсы", count: allCount },
    { id: "recurring", label: "Напоминалки", count: recCount },
    { id: "documents", label: "Документы", count: docCount },
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
          Инвойсов пока нет — создай первый через «+ Инвойс» или заведи напоминалку.
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
              Планируется
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
                  <div className="flex flex-col">
                    <span className="font-medium">
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {inv.invoice_number ?? "—"}
                      </span>
                      {project?.name ?? "—"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {inv.client_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono">
                  {inv.currency} {formatAmount(inv.amount)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {inv.scheduled_date ?? inv.issue_date ?? "—"}
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
                      {inv.due_date}
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

/* ─── templates table ─────────────────────────────────────────────── */

function TemplatesTable({
  templates,
  projectsById,
  projectOptions,
}: {
  templates: InvoiceTemplate[];
  projectsById: Map<string, { id: string; name: string }>;
  projectOptions: import("@/components/invoices/invoice-template-dialog").ProjectOption[];
}) {
  if (templates.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card py-16 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          Напоминалок нет. Заведи первую — например HAYS Project X, каждое 25-е число.
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
              Клиент / Проект
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Сумма
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              Частота
            </TableHead>
            <TableHead className="font-mono text-[10px] uppercase tracking-[0.15em]">
              День
            </TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t) => {
            const project = projectsById.get(t.project_id);
            const freq = t.frequency ?? "monthly";
            return (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{t.client_name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {project?.name ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono">
                  {t.currency} {formatAmount(t.amount)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {FREQ_LABELS[freq] ?? freq}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.issue_day ? `${t.issue_day}-го числа` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <TemplateRowActions
                    template={t}
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
          Напоминалок про документы нет. Пример: «Credit note от HAYS к 10-му числу».
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
                  {r.last_received_at
                    ? new Date(r.last_received_at).toISOString().slice(0, 10)
                    : "—"}
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
