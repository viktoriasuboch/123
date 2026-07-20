import Link from "next/link";
import type { Invoice } from "@/lib/schemas";
import { fmtDate } from "@/lib/calc";
import {
  InvoiceStatusBadge,
  effectiveStatus,
} from "./invoice-status-badge";

/**
 * List of invoices tied to a single project, with per-currency totals
 * split by state. Read-only summary — full CRUD lives on /invoices.
 */
export function ProjectInvoicesSection({
  invoices,
}: {
  invoices: Invoice[];
}) {
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

  return (
    <section className="rounded-md border bg-card">
      <header className="flex items-center justify-between p-4 border-b flex-wrap gap-3">
        <h2 className="font-display text-xl tracking-wide">
          🧾 Инвойсы по проекту
        </h2>
        <Link
          href="/invoices"
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition"
        >
          Все инвойсы →
        </Link>
      </header>

      {totals.size > 0 ? (
        <div className="p-4 border-b bg-muted/20 flex flex-wrap gap-x-8 gap-y-3">
          {[...totals.entries()].map(([currency, t]) => (
            <div key={currency} className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {currency}
              </div>
              <div className="flex items-center gap-4 font-mono text-sm">
                <span title="Не оплачено / выставлено">
                  <span className="text-muted-foreground">Ждём: </span>
                  {formatAmount(t.pending)}
                </span>
                {t.overdue > 0 ? (
                  <span className="text-destructive">
                    <span className="text-muted-foreground">Просрочено: </span>
                    {formatAmount(t.overdue)}
                  </span>
                ) : null}
                <span className="text-good">
                  <span className="text-muted-foreground">Оплачено: </span>
                  {formatAmount(t.paid)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <p className="p-6 text-center font-mono text-xs text-muted-foreground">
          По проекту ещё нет инвойсов. Создать можно на{" "}
          <Link href="/invoices" className="text-primary hover:underline">
            /invoices
          </Link>
          .
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <th className="text-left p-3 font-normal">Номер</th>
              <th className="text-left p-3 font-normal">Клиент</th>
              <th className="text-right p-3 font-normal">Сумма</th>
              <th className="text-left p-3 font-normal">Выставлен</th>
              <th className="text-left p-3 font-normal">Оплатить до</th>
              <th className="text-left p-3 font-normal">Статус</th>
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
                  <td className="p-3">{inv.client_name}</td>
                  <td className="p-3 text-right font-mono">
                    {inv.currency} {formatAmount(inv.amount)}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function formatAmount(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
