import type { Invoice } from "@/lib/schemas";

type Effective = "to_issue" | "issued" | "paid" | "overdue" | "cancelled";

export function effectiveStatus(inv: Invoice, todayISO?: string): Effective {
  const s = inv.status ?? "to_issue";
  if (s === "issued" && inv.due_date) {
    const today = todayISO ?? new Date().toISOString().slice(0, 10);
    if (inv.due_date < today) return "overdue";
  }
  return s as Effective;
}

const LABELS: Record<Effective, string> = {
  to_issue: "К выставлению",
  issued: "Выставлен",
  paid: "Оплачен",
  overdue: "Просрочен",
  cancelled: "Отменён",
};

const COLORS: Record<Effective, string> = {
  to_issue:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  issued:
    "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30",
  paid: "bg-good/15 text-good border border-good/30",
  overdue:
    "bg-destructive/15 text-destructive border border-destructive/40",
  cancelled:
    "bg-muted text-muted-foreground border border-border",
};

export function InvoiceStatusBadge({
  invoice,
  todayISO,
}: {
  invoice: Invoice;
  todayISO?: string;
}) {
  const s = effectiveStatus(invoice, todayISO);
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${COLORS[s]}`}
    >
      {LABELS[s]}
    </span>
  );
}
