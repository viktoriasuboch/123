import type { Invoice } from "@/lib/schemas";
import type { ProjectOption } from "./invoice-template-dialog";
import { fmtDate } from "@/lib/calc";
import { InvoiceRowActions } from "./invoice-row-actions";

export type OverdueItem = {
  invoice: Invoice;
  daysLate: number;
};

/**
 * Standalone overdue section for the dashboard. Overdue is absolute
 * ("as of today"), so this list ignores the period filter. Actions are
 * the existing row actions — «Оплачен» / Edit / Cancel — no bespoke
 * behaviour. Hidden by the caller when empty.
 */
export function OverdueList({
  items,
  projects,
  projectOptions,
}: {
  items: OverdueItem[];
  projects: Map<string, { id: string; name: string }>;
  projectOptions: ProjectOption[];
}) {
  return (
    <section className="rounded-md border border-destructive/40 bg-destructive/5">
      <header className="p-4 border-b border-destructive/20 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg tracking-wide leading-none text-destructive">
          Просрочено
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-destructive">
          {items.length} инв. · на сегодня
        </span>
      </header>
      <ul className="divide-y divide-destructive/15">
        {items.map(({ invoice, daysLate }) => {
          const project = projects.get(invoice.project_id);
          return (
            <li
              key={invoice.id}
              className="p-3 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <span className="font-mono text-muted-foreground">
                    {invoice.invoice_number ?? "—"}
                  </span>{" "}
                  <span className="font-medium">{project?.name ?? "—"}</span>{" "}
                  <span className="text-destructive">
                    — просрочен на {daysLate} дн.
                  </span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {invoice.client_name} · {invoice.currency}{" "}
                  {invoice.amount.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  · due {fmtDate(invoice.due_date)}
                </div>
              </div>
              <InvoiceRowActions invoice={invoice} projects={projectOptions} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
