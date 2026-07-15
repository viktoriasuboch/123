import Link from "next/link";
import {
  listInvoiceTemplates,
  listInvoices,
  plannedMonthlyForProject,
} from "@/lib/data/invoices";
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
import type { Invoice, InvoiceTemplate } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type SP = Promise<{ tab?: string }>;

const FREQ_LABELS: Record<string, string> = {
  monthly: "Ежемесячно",
  quarterly: "Раз в квартал",
  once: "Разово",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "all") as "all" | "recurring";

  const [templates, invoices, projects] = await Promise.all([
    listInvoiceTemplates(),
    listInvoices(),
    listProjects(),
  ]);

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  // Compute planned monthly for every project once (server-side) so
  // each dialog gets a lookup without needing a client call.
  const plannedEntries = await Promise.all(
    projects.map(async (p) => [
      p.id,
      await plannedMonthlyForProject(p.id),
    ] as const),
  );
  const projectOptions = plannedEntries.map(([id, planned]) => ({
    id,
    name: projectsById.get(id)?.name ?? "—",
    planned_monthly: planned,
  }));

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
                  + Шаблон
                </Button>
              }
            />
          ) : (
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

      <TabsNav tab={tab} allCount={invoices.length} recCount={templates.length} />

      {tab === "recurring" ? (
        <TemplatesTable
          templates={templates}
          projectsById={projectsById}
          projectOptions={projectOptions}
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
}: {
  tab: "all" | "recurring";
  allCount: number;
  recCount: number;
}) {
  const items: { id: "all" | "recurring"; label: string; count: number }[] = [
    { id: "all", label: "Все инвойсы", count: allCount },
    { id: "recurring", label: "Рекуррентные", count: recCount },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {items.map((it) => {
        const active = it.id === tab;
        return (
          <Link
            key={it.id}
            href={`/invoices?tab=${it.id}`}
            className={`px-3 py-2 -mb-px border-b-2 font-mono text-[10px] uppercase tracking-[0.15em] transition ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
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
          Инвойсов пока нет — создай первый через «+ Инвойс» или заведи рекуррентный шаблон.
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
                    <span className="font-medium">{inv.client_name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {project?.name ?? "—"}
                      {inv.invoice_number ? ` · ${inv.invoice_number}` : ""}
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
          Шаблонов нет. Создай первый — например HAYS Project X, каждое 25-е число.
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
              Следующее
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
                  {t.issue_day ? ` · ${t.issue_day}-го` : ""}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.next_issue_date ?? "—"}
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

function formatAmount(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
