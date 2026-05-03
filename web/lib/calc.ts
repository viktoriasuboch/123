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

/** $/month revenue: sell_rate * hours_load */
export function monthlyRevenue(m: ProjectMember) {
  return (m.sell_rate || 0) * (m.hours_load || 0);
}

/** $/month margin */
export function monthlyMargin(m: ProjectMember) {
  return marginPerHour(m) * (m.hours_load || 0);
}

/**
 * Aggregate active members of a project. Members sharing a `group_label`
 * count as one "seat": their buy rates sum, but the group's sell rate
 * and hours come from the lead (smallest sort_order in the group).
 * Singleton members (no group_label) behave exactly as before.
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
    const lead = sorted[0];
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

export function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
