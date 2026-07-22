import type { Invoice, ProjectMember } from "@/lib/schemas";

export const HOURS_PER_MONTH = 160;

/** buy rate per hour: staff salary÷160, freelancer raw buy_rate */
export function buyRate(m: Pick<ProjectMember, "employment_type" | "salary" | "buy_rate">) {
  return m.employment_type === "staff" ? (m.salary || 0) / HOURS_PER_MONTH : (m.buy_rate || 0);
}

/** $/h margin */
export function marginPerHour(m: ProjectMember) {
  return (m.sell_rate || 0) - buyRate(m);
}

/**
 * TM (Time & Material) members don't contribute predictable hours,
 * so we count them as zero everywhere that wants a forecastable
 * number — revenue, margin, hours, load. Their per-row marginPerHour
 * (rate-only) still works through `marginPerHour(m)` because that
 * call doesn't multiply by hours.
 */
function isTm(m: ProjectMember) {
  return (m.billing_mode ?? "fixed") === "tm";
}

/** $/month revenue: sell_rate * hours_load (TM contributes 0). */
export function monthlyRevenue(m: ProjectMember) {
  if (isTm(m)) return 0;
  return (m.sell_rate || 0) * (m.hours_load || 0);
}

/** $/month margin (TM contributes 0). */
export function monthlyMargin(m: ProjectMember) {
  if (isTm(m)) return 0;
  return marginPerHour(m) * (m.hours_load || 0);
}

/**
 * Aggregate active members of a project, with two special cases:
 *
 * 1. Proxy pair (`group_label` set on exactly two members where one
 *    has `proxy_role='face'` and the other `'worker'`): hours and
 *    revenue come from the worker only. Cost = worker buy/h × hours
 *    + (face.proxy_bonus / 160) × hours — the bonus is amortised per
 *    worker-hour, so a half-loaded worker only triggers half the
 *    bonus payout.
 *
 * 2. Legacy group (≥2 members with same `group_label`, no proxy_role):
 *    seat behaviour as before — sell + hours from the smallest
 *    sort_order member, buy is the sum across the group.
 *
 * Singletons (no label) keep the original per-member math.
 */
export function aggregateProject(members: ProjectMember[]) {
  const active = members.filter((m) => m.is_active !== false);

  // Bucket by group_label; null/empty go into per-member singleton buckets.
  const buckets: Record<string, ProjectMember[]> = {};
  let soloIdx = 0;
  for (const m of active) {
    const label = m.group_label?.trim();
    const key = label ? `g:${label}` : `s:${soloIdx++}`;
    (buckets[key] ??= []).push(m);
  }

  let totalHours = 0;
  let totalRev = 0;
  let totalMargin = 0;
  let lowMargin = 0;

  for (const list of Object.values(buckets)) {
    const sorted = [...list].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    // Proxy pair?
    if (
      sorted.length === 2 &&
      sorted.some((m) => m.proxy_role === "face") &&
      sorted.some((m) => m.proxy_role === "worker")
    ) {
      const face = sorted.find((m) => m.proxy_role === "face")!;
      const worker = sorted.find((m) => m.proxy_role === "worker")!;
      const sell = worker.sell_rate || 0;
      const hours = worker.hours_load || 0;
      const workerBuy = buyRate(worker);
      const bonusPerH = (face.proxy_bonus || 0) / HOURS_PER_MONTH;
      const effBuy = workerBuy + bonusPerH;
      totalHours += hours;
      totalRev += sell * hours;
      totalMargin += (sell - effBuy) * hours;
      if (sell - effBuy < 20) lowMargin++;
      continue;
    }

    // Legacy group OR singleton.
    const lead = sorted[0];
    // TM singletons don't add hours / revenue / margin to the
    // aggregate. Multi-member legacy groups keep their existing
    // behaviour (TM marking on group leads is not expected).
    if (sorted.length === 1 && isTm(lead)) continue;
    const sell = lead.sell_rate || 0;
    const hours = lead.hours_load || 0;
    const sumBuy = sorted.reduce((s, m) => s + buyRate(m), 0);

    totalHours += hours;
    totalRev += sell * hours;
    totalMargin += (sell - sumBuy) * hours;

    if (sell - sumBuy < 20) lowMargin++;
  }

  const avgMargH = totalHours > 0 ? totalMargin / totalHours : 0;
  return {
    teamSize: members.length,
    activeCount: active.length,
    totalHours,
    totalRev,
    totalMargin,
    avgMargH,
    lowMargin,
  };
}

export function fmtMoney(v: number, opts?: { sign?: boolean }) {
  const sign = opts?.sign && v > 0 ? "+" : "";
  return `${sign}$${Math.round(v).toLocaleString("en-US")}`;
}

/**
 * Adaptive rate formatter: integers stay integers ("$50"), fractions
 * round to two decimals and drop trailing zeros ("$16.67", "$12.5").
 * Negative numbers preserve their sign on the digits, not on the "$"
 * (e.g. "-$3.20").
 */
export function fmtRate(v: number) {
  const sign = v < 0 ? "-" : "";
  const n = Math.abs(v);
  const rounded = Math.round(n * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(2).replace(/\.?0+$/, "");
  return `${sign}$${text}`;
}

/**
 * Format an ISO date (YYYY-MM-DD or full ISO string) as dd-mm-yyyy —
 * the format the user standardised on. Returns "—" for null/invalid.
 */
export function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Advance a Sat/Sun issue day to the following Monday. Recurring
 * invoice templates use this: if the target day-of-month falls on a
 * weekend, the reminder + calendar dot render on the next business
 * day instead. Returns the adjusted ISO date (YYYY-MM-DD).
 */
export function adjustedIssueDateISO(
  year: number,
  month0: number,
  day: number,
): string {
  const d = new Date(year, month0, day);
  // 0 = Sun, 6 = Sat
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** today's local date as YYYY-MM-DD (not UTC — avoids off-by-one near midnight). */
function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Where a monthly recurring reminder next lands, relative to `today`.
 *
 * - This month's issue day still ahead (or today) → that date, not missed.
 * - Already passed this month:
 *     - template existed on/before that date → genuine miss (user
 *       forgot to issue): keep the past date, `missed = true` (renders
 *       with ❗ "N дн. назад").
 *     - template was created AFTER the day already passed (e.g. set up
 *       mid-month) → roll forward to next month's issue day, not missed.
 *       This is the fix for "reminder for the 9th shows '13 дн. назад'
 *       when I only just created it on the 22nd".
 *
 * Weekend issue days are shifted to Monday via adjustedIssueDateISO.
 */
export function monthlyReminderDue(
  issueDay: number,
  createdAtISO: string | null | undefined,
  today: Date,
): { dueISO: string; daysUntil: number; missed: boolean } {
  const y = today.getFullYear();
  const m = today.getMonth();
  const todayISO = localISO(today);
  const thisMonth = adjustedIssueDateISO(y, m, issueDay);

  let dueISO: string;
  let missed = false;
  if (thisMonth >= todayISO) {
    dueISO = thisMonth;
  } else {
    const created = createdAtISO ? createdAtISO.slice(0, 10) : null;
    const existedByThen = created ? created <= thisMonth : true;
    if (existedByThen) {
      dueISO = thisMonth;
      missed = true;
    } else {
      dueISO = adjustedIssueDateISO(y, m + 1, issueDay);
    }
  }

  const due = new Date(dueISO + "T00:00:00");
  const midnight = new Date(y, m, today.getDate());
  const daysUntil = Math.round(
    (due.getTime() - midnight.getTime()) / 86400_000,
  );
  return { dueISO, daysUntil, missed };
}

/* ═══ invoices dashboard aggregators (pure, over listInvoices) ═══════ */

export type DashboardPeriodKind = "this" | "prev" | "prev2" | "custom";
export type DashboardPeriod = {
  kind: DashboardPeriodKind;
  /** inclusive YYYY-MM-DD */
  from: string;
  /** inclusive YYYY-MM-DD */
  to: string;
};

type CurrencyBucket = Record<string, number>;
export type AgingBucketMap = Record<"0-30" | "31-60" | "60+", CurrencyBucket>;

const ymUTC = (d: Date) => d.toISOString().slice(0, 7);
const ymdUTC = (d: Date) => d.toISOString().slice(0, 10);
const dateKey = (iso: string) => iso.slice(0, 10);

/**
 * Resolve the dashboard's period from URL params into an inclusive
 * YYYY-MM-DD range. Month presets are computed in UTC off `now`;
 * `custom` uses the from/to params and falls back to the current month
 * when either is missing/invalid or inverted. String comparison on the
 * YYYY-MM-DD keys is enough downstream, so no timezone math leaks out.
 */
export function dashboardPeriod(
  kind: string | undefined,
  fromParam: string | undefined,
  toParam: string | undefined,
  now: Date,
): DashboardPeriod {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const monthRange = (yy: number, mm: number) => ({
    from: ymdUTC(new Date(Date.UTC(yy, mm, 1))),
    to: ymdUTC(new Date(Date.UTC(yy, mm + 1, 0))),
  });

  if (kind === "prev") return { kind: "prev", ...monthRange(y, m - 1) };
  if (kind === "prev2") return { kind: "prev2", ...monthRange(y, m - 2) };
  if (kind === "custom") {
    const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (isDate(fromParam) && isDate(toParam) && fromParam! <= toParam!) {
      return { kind: "custom", from: fromParam!, to: toParam! };
    }
    return { kind: "custom", ...monthRange(y, m) };
  }
  return { kind: "this", ...monthRange(y, m) };
}

const notCancelled = (inv: Invoice) => (inv.status ?? "to_issue") !== "cancelled";
const inRangeISO = (iso: string | null | undefined, p: { from: string; to: string }) => {
  if (!iso) return false;
  const k = dateKey(iso);
  return k >= p.from && k <= p.to;
};

/** Currency carrying the largest non-cancelled volume; "USD" if empty. */
export function primaryCurrency(invoices: Invoice[]): string {
  const totals: CurrencyBucket = {};
  for (const inv of invoices) {
    if (!notCancelled(inv)) continue;
    totals[inv.currency] = (totals[inv.currency] ?? 0) + inv.amount;
  }
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "USD";
}

/** Paid cash for one currency, bucketed by paid_date month, last N months up to `now`. */
export function cashByMonth(
  invoices: Invoice[],
  currency: string,
  now: Date,
  monthsBack = 6,
): { ym: string; total: number }[] {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    months.push(ymUTC(new Date(Date.UTC(y, m - i, 1))));
  }
  const totals = new Map<string, number>(months.map((ym) => [ym, 0]));
  for (const inv of invoices) {
    if (inv.currency !== currency) continue;
    if ((inv.status ?? "") !== "paid" || !inv.paid_date) continue;
    const ym = dateKey(inv.paid_date).slice(0, 7);
    if (totals.has(ym)) {
      totals.set(ym, totals.get(ym)! + (inv.paid_amount ?? inv.amount));
    }
  }
  return months.map((ym) => ({ ym, total: totals.get(ym)! }));
}

/** Top-N clients by issued volume in the period; the rest folded into "Другие". */
export function topClients(
  invoices: Invoice[],
  currency: string,
  period: { from: string; to: string },
  n = 5,
): { name: string; total: number }[] {
  const totals: CurrencyBucket = {};
  for (const inv of invoices) {
    if (inv.currency !== currency || !notCancelled(inv)) continue;
    if (!inRangeISO(inv.issue_date, period)) continue;
    totals[inv.client_name] = (totals[inv.client_name] ?? 0) + inv.amount;
  }
  const sorted = Object.entries(totals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  if (sorted.length <= n) return sorted;
  const rest = sorted.slice(n).reduce((s, c) => s + c.total, 0);
  return [...sorted.slice(0, n), { name: "Другие", total: rest }];
}

/** Issue→paid latency distribution for invoices paid within the period. */
export function paymentLatency(
  invoices: Invoice[],
  currency: string,
  period: { from: string; to: string },
): { avgDays: number; count: number; buckets: { label: string; count: number }[] } {
  const bucketDefs: { label: string; test: (d: number) => boolean }[] = [
    { label: "0–7", test: (d) => d <= 7 },
    { label: "8–14", test: (d) => d <= 14 },
    { label: "15–30", test: (d) => d <= 30 },
    { label: "30+", test: () => true },
  ];
  const buckets = bucketDefs.map((b) => ({ label: b.label, count: 0 }));
  let sum = 0;
  let count = 0;
  for (const inv of invoices) {
    if (inv.currency !== currency) continue;
    if ((inv.status ?? "") !== "paid" || !inv.paid_date || !inv.issue_date) continue;
    if (!inRangeISO(inv.paid_date, period)) continue;
    const days = Math.round(
      (Date.parse(inv.paid_date) - Date.parse(inv.issue_date)) / 86400_000,
    );
    if (!Number.isFinite(days) || days < 0) continue;
    sum += days;
    count++;
    const idx = bucketDefs.findIndex((b) => b.test(days));
    buckets[idx].count++;
  }
  return { avgDays: count ? Math.round(sum / count) : 0, count, buckets };
}

/**
 * Aging of overdue invoices, absolute "as of `now`" (independent of the
 * period filter). Overdue = issued invoice whose due_date is before
 * today — the same UI-derived rule used elsewhere.
 */
export function agingBuckets(invoices: Invoice[], now: Date): AgingBucketMap {
  const todayISO = ymdUTC(now);
  const aging: AgingBucketMap = { "0-30": {}, "31-60": {}, "60+": {} };
  for (const inv of invoices) {
    const s = inv.status ?? "to_issue";
    if (s !== "issued" || !inv.due_date) continue;
    if (dateKey(inv.due_date) >= todayISO) continue; // not overdue yet
    const daysLate = Math.floor(
      (now.getTime() - Date.parse(inv.due_date)) / 86400_000,
    );
    const b = daysLate <= 30 ? "0-30" : daysLate <= 60 ? "31-60" : "60+";
    aging[b][inv.currency] = (aging[b][inv.currency] ?? 0) + inv.amount;
  }
  return aging;
}
