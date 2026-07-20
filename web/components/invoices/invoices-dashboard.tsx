import type {
  Invoice,
  InvoiceTemplate,
  DocumentReminder,
} from "@/lib/schemas";
import { effectiveStatus } from "./invoice-status-badge";

type CurrencyBucket = Record<string, number>;
type AgingBucket = Record<string, CurrencyBucket>;

/** True if the ISO date falls in the given (year, month0) pair. */
function inMonth(iso: string | null | undefined, year: number, month0: number) {
  if (!iso) return false;
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month0;
}

export function InvoicesDashboard({
  invoices,
  templates,
  reminders,
  projects,
}: {
  invoices: Invoice[];
  templates: InvoiceTemplate[];
  reminders: DocumentReminder[];
  projects: Map<string, { id: string; name: string }>;
}) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const y = today.getFullYear();
  const m = today.getMonth();
  const prevMonth = m === 0 ? 11 : m - 1;
  const prevYear = m === 0 ? y - 1 : y;

  const pending: CurrencyBucket = {};
  const overdue: CurrencyBucket = {};
  const paidThisMonth: CurrencyBucket = {};
  const paidPrevMonth: CurrencyBucket = {};
  const aging: AgingBucket = { "0-30": {}, "31-60": {}, "60+": {} };

  for (const inv of invoices) {
    const s = effectiveStatus(inv, todayISO);
    if (s === "cancelled") continue;
    if (s === "paid") {
      if (inMonth(inv.paid_date, y, m)) {
        bump(paidThisMonth, inv.currency, inv.paid_amount ?? inv.amount);
      } else if (inMonth(inv.paid_date, prevYear, prevMonth)) {
        bump(paidPrevMonth, inv.currency, inv.paid_amount ?? inv.amount);
      }
      continue;
    }
    if (s === "overdue") {
      bump(overdue, inv.currency, inv.amount);
      const due = inv.due_date ? new Date(inv.due_date + "T00:00:00Z") : null;
      const daysLate = due
        ? Math.floor((today.getTime() - due.getTime()) / 86400_000)
        : 0;
      const bucket =
        daysLate <= 30 ? "0-30" : daysLate <= 60 ? "31-60" : "60+";
      bump(aging[bucket], inv.currency, inv.amount);
      continue;
    }
    // to_issue + issued (not yet overdue) — both count as "waiting".
    if (s === "issued" || s === "to_issue") {
      bump(pending, inv.currency, inv.amount);
    }
  }

  // Upcoming 7 days: any invoice with due_date in [today, today+7], any
  // reminder whose next expected date falls in the window, any template
  // whose issue_day falls in the window.
  const upcoming: UpcomingEvent[] = [];
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  const in7ISO = in7.toISOString().slice(0, 10);

  for (const inv of invoices) {
    const s = effectiveStatus(inv, todayISO);
    if (s !== "issued") continue;
    if (!inv.due_date) continue;
    if (inv.due_date >= todayISO && inv.due_date <= in7ISO) {
      upcoming.push({
        date: inv.due_date,
        type: "pay",
        title: `${inv.invoice_number ?? "—"} ${projects.get(inv.project_id)?.name ?? ""}`,
        detail: `${inv.currency} ${formatAmount(inv.amount)} · ${inv.client_name}`,
      });
    }
  }
  for (const t of templates) {
    if (t.active === false || !t.issue_day) continue;
    const dt = new Date(y, m, t.issue_day);
    const iso = dt.toISOString().slice(0, 10);
    if (iso >= todayISO && iso <= in7ISO) {
      upcoming.push({
        date: iso,
        type: "issue",
        title: projects.get(t.project_id)?.name ?? "—",
        detail: `${t.client_name} · ~${t.currency} ${formatAmount(t.amount)}`,
      });
    }
  }
  for (const r of reminders) {
    if (r.active === false) continue;
    const dt = new Date(y, m, r.expected_day);
    const iso = dt.toISOString().slice(0, 10);
    if (iso >= todayISO && iso <= in7ISO) {
      upcoming.push({
        date: iso,
        type: "document",
        title: r.name,
        detail: projects.get(r.project_id)?.name ?? "—",
      });
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ожидается · этот месяц" bucket={pending} tone="warn" />
        <KpiCard label="Просрочено" bucket={overdue} tone="bad" />
        <KpiCard label="Оплачено · этот месяц" bucket={paidThisMonth} tone="good" />
        <KpiCard label="Оплачено · прошлый месяц" bucket={paidPrevMonth} tone="muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border bg-card">
          <header className="p-4 border-b">
            <h3 className="font-display text-lg tracking-wide leading-none">
              Aging просроченных
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
              Сколько дней прошло с due date
            </p>
          </header>
          <AgingTable aging={aging} />
        </section>

        <section className="rounded-md border bg-card">
          <header className="p-4 border-b">
            <h3 className="font-display text-lg tracking-wide leading-none">
              Ближайшие 7 дней
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
              Что произойдёт до {in7ISO}
            </p>
          </header>
          <UpcomingList events={upcoming} />
        </section>
      </div>
    </div>
  );
}

/* ─── KPI card ────────────────────────────────────────────────────── */

function KpiCard({
  label,
  bucket,
  tone,
}: {
  label: string;
  bucket: CurrencyBucket;
  tone: "good" | "bad" | "warn" | "muted";
}) {
  const entries = Object.entries(bucket).sort((a, b) => b[1] - a[1]);
  const toneCls =
    tone === "good"
      ? "text-good"
      : tone === "bad"
        ? "text-destructive"
        : tone === "warn"
          ? "text-warn"
          : "text-foreground";

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
        {label}
      </div>
      {entries.length === 0 ? (
        <div className="font-display text-2xl text-muted-foreground">—</div>
      ) : (
        <div className="space-y-1">
          {entries.map(([currency, amount]) => (
            <div
              key={currency}
              className={`font-display text-2xl leading-tight ${toneCls}`}
            >
              <span className="font-mono text-xs text-muted-foreground mr-1.5">
                {currency}
              </span>
              {formatAmount(amount)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── aging table ─────────────────────────────────────────────────── */

function AgingTable({ aging }: { aging: AgingBucket }) {
  const currencies = Array.from(
    new Set(
      Object.values(aging).flatMap((b) => Object.keys(b)),
    ),
  ).sort();

  if (currencies.length === 0) {
    return (
      <p className="p-6 text-center font-mono text-xs text-muted-foreground">
        Нет просроченных инвойсов.
      </p>
    );
  }

  const buckets: Array<keyof typeof aging> = ["0-30", "31-60", "60+"];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <th className="text-left p-3 font-normal">Валюта</th>
          {buckets.map((b) => (
            <th key={b} className="text-right p-3 font-normal">
              {b} дн.
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {currencies.map((c) => (
          <tr key={c} className="border-b border-border/30 last:border-b-0">
            <td className="p-3 font-mono text-xs">{c}</td>
            {buckets.map((b) => {
              const amt = aging[b][c] ?? 0;
              return (
                <td
                  key={b}
                  className={`p-3 text-right font-mono ${
                    amt > 0 && b !== "0-30" ? "text-destructive" : ""
                  }`}
                >
                  {amt > 0 ? formatAmount(amt) : "—"}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── upcoming events list ────────────────────────────────────────── */

type UpcomingEvent = {
  date: string;
  type: "issue" | "pay" | "document";
  title: string;
  detail: string;
};

const TYPE_META: Record<
  UpcomingEvent["type"],
  { label: string; cls: string }
> = {
  issue: { label: "выставить", cls: "text-amber-600 dark:text-amber-400" },
  pay: { label: "оплата", cls: "text-sky-600 dark:text-sky-400" },
  document: { label: "документ", cls: "text-violet-600 dark:text-violet-400" },
};

function UpcomingList({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="p-6 text-center font-mono text-xs text-muted-foreground">
        В ближайшие 7 дней ничего не запланировано.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border/40">
      {events.map((e, i) => {
        const meta = TYPE_META[e.type];
        return (
          <li
            key={`${e.date}-${e.type}-${i}`}
            className="p-3 flex items-start gap-3"
          >
            <div className="font-mono text-[11px] text-muted-foreground w-20 shrink-0">
              {e.date}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.15em] ${meta.cls} mr-2`}
                >
                  {meta.label}
                </span>
                <span className="font-medium">{e.title}</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground truncate">
                {e.detail}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function bump(bucket: CurrencyBucket, currency: string, amount: number) {
  bucket[currency] = (bucket[currency] ?? 0) + amount;
}

function formatAmount(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
