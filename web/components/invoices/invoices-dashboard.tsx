import type {
  Invoice,
  InvoiceTemplate,
  DocumentReminder,
} from "@/lib/schemas";
import type { ProjectOption } from "./invoice-template-dialog";
import {
  fmtDate,
  adjustedIssueDateISO,
  primaryCurrency,
  cashByMonth,
  topClients,
  paymentLatency,
  agingBuckets,
  type DashboardPeriod,
  type AgingBucketMap,
} from "@/lib/calc";
import { effectiveStatus } from "./invoice-status-badge";
import { DashboardPeriodFilter } from "./dashboard-period-filter";
import {
  CashByMonthBar,
  TopClientsDonut,
  PaymentLatencyBars,
} from "./dashboard-charts";
import { OverdueList, type OverdueItem } from "./overdue-list";

type CurrencyBucket = Record<string, number>;

const dateKey = (iso: string | null | undefined) => iso?.slice(0, 10) ?? "";
const inPeriod = (iso: string | null | undefined, p: DashboardPeriod) => {
  const k = dateKey(iso);
  return !!k && k >= p.from && k <= p.to;
};

export function InvoicesDashboard({
  invoices,
  templates,
  reminders,
  projects,
  projectOptions,
  period,
  overdue,
}: {
  invoices: Invoice[];
  templates: InvoiceTemplate[];
  reminders: DocumentReminder[];
  projects: Map<string, { id: string; name: string }>;
  projectOptions: ProjectOption[];
  period: DashboardPeriod;
  overdue: OverdueItem[];
}) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // ── period-aware KPI buckets ──────────────────────────────────────
  const pending: CurrencyBucket = {}; // due within period, not yet paid
  const paid: CurrencyBucket = {}; // paid within period
  const issued: CurrencyBucket = {}; // issued (created) within period
  const overdueBucket: CurrencyBucket = {}; // absolute, as of today

  for (const inv of invoices) {
    const s = inv.status ?? "to_issue";
    if (s === "cancelled") continue;
    if (s === "paid") {
      if (inPeriod(inv.paid_date, period)) {
        bump(paid, inv.currency, inv.paid_amount ?? inv.amount);
      }
    } else if (inPeriod(inv.due_date, period)) {
      bump(pending, inv.currency, inv.amount);
    }
    if (inPeriod(inv.issue_date, period)) {
      bump(issued, inv.currency, inv.amount);
    }
  }
  for (const { invoice } of overdue) {
    bump(overdueBucket, invoice.currency, invoice.amount);
  }

  // ── charts (single dominant currency, no cross-currency sums) ─────
  const currency = primaryCurrency(invoices);
  const cash = cashByMonth(invoices, currency, today, 6);
  const clients = topClients(invoices, currency, period, 5);
  const latency = paymentLatency(invoices, currency, period);

  // ── aging: absolute, as of today ─────────────────────────────────
  const aging = agingBuckets(invoices, today);
  const agingHasRows = Object.values(aging).some(
    (b) => Object.keys(b).length > 0,
  );

  // ── upcoming 7 days (unchanged behaviour) ─────────────────────────
  const upcoming = buildUpcoming(
    invoices,
    templates,
    reminders,
    projects,
    today,
    todayISO,
  );

  return (
    <div className="space-y-6">
      <DashboardPeriodFilter
        kind={period.kind}
        from={period.from}
        to={period.to}
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ожидается · период" bucket={pending} tone="warn" />
        <KpiCard label="Просрочено · сегодня" bucket={overdueBucket} tone="bad" />
        <KpiCard label="Оплачено · период" bucket={paid} tone="good" />
        <KpiCard label="Выставлено · период" bucket={issued} tone="muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CashByMonthBar data={cash} currency={currency} />
        <TopClientsDonut data={clients} currency={currency} />
        <PaymentLatencyBars
          avgDays={latency.avgDays}
          count={latency.count}
          buckets={latency.buckets}
          currency={currency}
        />
      </div>

      {overdue.length > 0 ? (
        <OverdueList
          items={overdue}
          projects={projects}
          projectOptions={projectOptions}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {agingHasRows ? (
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
        ) : null}

        <section className="rounded-md border bg-card">
          <header className="p-4 border-b">
            <h3 className="font-display text-lg tracking-wide leading-none">
              Ближайшие 7 дней
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
              Что произойдёт до {fmtDate(upcomingHorizon(today))}
            </p>
          </header>
          <UpcomingList events={upcoming} />
        </section>
      </div>
    </div>
  );
}

function upcomingHorizon(today: Date): string {
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  return in7.toISOString().slice(0, 10);
}

/* ─── upcoming events builder ─────────────────────────────────────── */

type UpcomingEvent = {
  date: string;
  type: "issue" | "pay" | "document";
  title: string;
  detail: string;
};

function buildUpcoming(
  invoices: Invoice[],
  templates: InvoiceTemplate[],
  reminders: DocumentReminder[],
  projects: Map<string, { id: string; name: string }>,
  today: Date,
  todayISO: string,
): UpcomingEvent[] {
  const y = today.getFullYear();
  const m = today.getMonth();
  const in7ISO = upcomingHorizon(today);
  const upcoming: UpcomingEvent[] = [];

  for (const inv of invoices) {
    if (effectiveStatus(inv, todayISO) !== "issued") continue;
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
    const iso = adjustedIssueDateISO(y, m, t.issue_day);
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
  return upcoming;
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

function AgingTable({ aging }: { aging: AgingBucketMap }) {
  const currencies = Array.from(
    new Set(Object.values(aging).flatMap((b) => Object.keys(b))),
  ).sort();

  const buckets: Array<keyof AgingBucketMap> = ["0-30", "31-60", "60+"];

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
            <div className="font-mono text-[11px] text-muted-foreground w-24 shrink-0">
              {fmtDate(e.date)}
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
