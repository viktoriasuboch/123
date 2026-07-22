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
import { TemplateRowActions } from "@/components/invoices/template-row-actions";
import {
  InvoiceStatusBadge,
  effectiveStatus,
} from "@/components/invoices/invoice-status-badge";
import { fmtDate } from "@/lib/calc";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const FREQ: Record<string, string> = {
  monthly: "каждый месяц",
  quarterly: "раз в квартал",
  biweekly: "каждые 2 недели",
  once: "разово",
};

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

      <section className="rounded-md border bg-card">
        <header className="p-4 border-b">
          <h2 className="font-display text-xl tracking-wide leading-none">
            🔁 Рекуррентные инвойсы
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
            {templates.length} шт.
          </p>
        </header>
        {templates.length === 0 ? (
          <p className="p-6 text-center font-mono text-xs text-muted-foreground">
            Рекуррентных инвойсов у проекта нет — заведи через «+ Рекуррентный».
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="text-right p-3 font-normal">Сумма</th>
                <th className="text-left p-3 font-normal">Периодичность</th>
                <th className="text-left p-3 font-normal">В этом месяце</th>
                <th className="text-right p-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const done = templateDoneThisMonth(t);
                return (
                  <tr
                    key={t.id}
                    className="border-b border-border/40 hover:bg-muted/20 transition"
                  >
                    <td className="p-3 text-right font-mono">
                      {t.currency}{" "}
                      {t.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-sm">{describeFrequency(t)}</td>
                    <td className="p-3">
                      {done ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-good">
                          ✓ выполнено
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
                          ждёт
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <TemplateRowActions
                        template={t}
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

function templateDoneThisMonth(t: {
  last_issued_at?: string | null;
}): boolean {
  if (!t.last_issued_at) return false;
  const now = new Date();
  const d = new Date(t.last_issued_at);
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function describeFrequency(t: {
  frequency?: string;
  issue_day?: number | null;
  next_issue_date?: string | null;
}): string {
  const freq = t.frequency ?? "monthly";
  if (freq === "monthly") {
    return t.issue_day
      ? `каждое ${t.issue_day}-е число`
      : FREQ.monthly;
  }
  if (freq === "biweekly") {
    return t.next_issue_date
      ? `каждые 2 недели с ${fmtDate(t.next_issue_date)}`
      : FREQ.biweekly;
  }
  if (freq === "quarterly") {
    return t.issue_day
      ? `раз в квартал, ${t.issue_day}-го`
      : FREQ.quarterly;
  }
  return FREQ.once;
}
