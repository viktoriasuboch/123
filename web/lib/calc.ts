import type { ProjectMember } from "@/lib/schemas";

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
