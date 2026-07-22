import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/projects";
import {
  listInvoices,
  listInvoiceTemplates,
  plannedMonthlyForProject,
  nextInvoiceNumberForProject,
} from "@/lib/data/invoices";
import { Button } from "@/components/ui/button";
import { InvoiceDialog } from "@/components/invoices/invoice-dialog";
import { InvoiceTemplateDialog } from "@/components/invoices/invoice-template-dialog";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import {
  InvoiceStatusBadge,
  effectiveStatus,
} from "@/components/invoices/invoice-status-badge";
import { fmtDate, monthlyReminderDue, biweeklyNextISO } from "@/lib/calc";
import type { InvoiceTemplate } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function InvoiceProjectPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const [project, allInvoices, allTemplates, planned, nextNumber] =
    await Promise.all([
      getProject(id),
      listInvoices(),
      listInvoiceTemplates(),
      plannedMonthlyForProject(id),
      nextInvoiceNumberForProject(id),
    ]);
  if (!project) notFound();

  const invoices = allInvoices.filter((inv) => inv.project_id === id);
  const templates = allTemplates.filter((t) => t.project_id === id);
  // One schedule per project: prefer an active one, else whatever exists.
  const schedule =
    templates.find((t) => t.active !== false) ?? templates[0] ?? null;

  // Per-currency totals split by state for the summary strip.
  const totals = new Map<
    string,
    { pending: number; overdue: number; paid: number }
  >();
  for (const inv of invoices) {
    const s = effectiveStatus(inv);
    if (s === "cancelled") continue;
    const bucket =
      totals.get(inv.currency) ?? { pending: 0, overdue: 0, paid: 0 };
    if (s === "paid") bucket.paid += inv.paid_amount ?? inv.amount;
    else if (s === "overdue") bucket.overdue += inv.amount;
    else if (s === "issued" || s === "to_issue") bucket.pending += inv.amount;
    totals.set(inv.currency, bucket);
  }

  // Only the current project as the ProjectOption feed for dialogs.
  const projectOption = {
    id: project.id,
    name: project.name,
    planned_monthly: planned,
    next_invoice_number: nextNumber,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/invoices?tab=projects"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground inline-block"
      >
        ← все проекты
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl tracking-widest text-primary leading-none">
            {project.name}
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {planned > 0
              ? `~$${planned.toLocaleString("en-US", { maximumFractionDigits: 0 })} / мес по команде`
              : "Планируется/мес: —"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <InvoiceDialog
            projects={[projectOption]}
            defaultProjectId={project.id}
            trigger={
              <Button
                size="sm"
                className="font-mono text-[10px] uppercase tracking-[0.15em]"
              >
                + Инвойс
              </Button>
            }
          />
          <InvoiceTemplateDialog
            projects={[projectOption]}
            template={schedule ?? undefined}
            defaultProjectId={project.id}
            trigger={
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-[10px] uppercase tracking-[0.15em]"
              >
                ⚙ Настроить напоминание
              </Button>
            }
          />
        </div>
      </header>

      {totals.size > 0 ? (
        <div className="rounded-md border bg-card p-4 flex flex-wrap gap-x-8 gap-y-3">
          {[...totals.entries()].map(([currency, t]) => (
            <div key={currency} className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {currency}
              </div>
              <div className="flex items-center gap-4 font-mono text-sm">
                <span>
                  <span className="text-muted-foreground">Ждём: </span>
                  {t.pending.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                {t.overdue > 0 ? (
                  <span className="text-destructive">
                    <span className="text-muted-foreground">Просрочено: </span>
                    {t.overdue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                ) : null}
                <span className="text-good">
                  <span className="text-muted-foreground">Оплачено: </span>
                  {t.paid.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <InvoiceDateBlock schedule={schedule} />
        <NextInvoiceBlock schedule={schedule} planned={planned} />
      </div>

      <section className="rounded-md border bg-card">
        <header className="p-4 border-b">
          <h2 className="font-display text-xl tracking-wide leading-none">
            🧾 Все инвойсы
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
            {invoices.length} шт. — от pending до paid
          </p>
        </header>
        {invoices.length === 0 ? (
          <p className="p-6 text-center font-mono text-xs text-muted-foreground">
            Инвойсов по проекту нет.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="text-left p-3 font-normal">Номер</th>
                <th className="text-right p-3 font-normal">Сумма</th>
                <th className="text-left p-3 font-normal">Выставлен</th>
                <th className="text-left p-3 font-normal">Оплатить до</th>
                <th className="text-left p-3 font-normal">Статус</th>
                <th className="text-right p-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const s = effectiveStatus(inv);
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-border/40 hover:bg-muted/20 transition"
                  >
                    <td className="p-3 font-mono text-xs">
                      {inv.invoice_number ?? "—"}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {inv.currency}{" "}
                      {inv.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {fmtDate(inv.issue_date)}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
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
                    </td>
                    <td className="p-3">
                      <InvoiceStatusBadge invoice={inv} />
                    </td>
                    <td className="p-3 text-right">
                      <InvoiceRowActions
                        invoice={inv}
                        projects={[projectOption]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/** Frequency label WITHOUT the anchor date — the start date lives in
 *  settings, the block only states the cadence. */
function describeFrequency(t: InvoiceTemplate): string {
  const freq = t.frequency ?? "monthly";
  if (freq === "biweekly") return "каждые 2 недели";
  if (freq === "quarterly") return "раз в квартал";
  if (freq === "once") return "разово";
  return t.issue_day ? `каждое ${t.issue_day}-е число` : "каждый месяц";
}

/** ① Invoice date — how issuing is scheduled (read-only). */
function InvoiceDateBlock({ schedule }: { schedule: InvoiceTemplate | null }) {
  const paused = schedule?.active === false;
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        📅 Invoice date
      </div>
      {!schedule ? (
        <div className="mt-2 text-sm text-muted-foreground italic">
          уведомление не настроено
        </div>
      ) : (
        <>
          <div className="mt-2 font-display text-2xl leading-tight">
            {describeFrequency(schedule)}
          </div>
          {paused ? (
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
              на паузе
            </div>
          ) : null}
        </>
      )}
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Правится в «⚙ Настроить напоминание»
      </div>
    </section>
  );
}

/** ② Next Invoice date — forecast of the next issue + approx amount. */
function NextInvoiceBlock({
  schedule,
  planned,
}: {
  schedule: InvoiceTemplate | null;
  planned: number;
}) {
  const today = new Date();
  let dueISO: string | null = null;
  let amount = 0;

  if (schedule && schedule.active !== false) {
    const freq = schedule.frequency ?? "monthly";
    if (freq === "biweekly") {
      dueISO = biweeklyNextISO(schedule.next_issue_date, today);
      amount = planned / 2; // Projects holds a month; biweekly bills half.
    } else if (freq === "monthly" && schedule.issue_day) {
      dueISO = monthlyReminderDue(
        schedule.issue_day,
        schedule.created_at,
        today,
      ).dueISO;
      amount = planned;
    }
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        ⏭ Next Invoice date
      </div>
      {dueISO ? (
        <>
          <div className="mt-2 font-display text-2xl leading-tight text-primary">
            {fmtDate(dueISO)}
          </div>
          <div className="mt-1 font-mono text-sm text-muted-foreground">
            ≈ {schedule?.currency ?? "USD"}{" "}
            {amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
        </>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground italic">
          {schedule ? "расписание на паузе" : "нет расписания"}
        </div>
      )}
    </section>
  );
}
