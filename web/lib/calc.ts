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

/** Aggregate active members of a project. */
export function aggregateProject(members: ProjectMember[]) {
  const active = members.filter((m) => m.is_active !== false);
  const totalHours = active.reduce((s, m) => s + (m.hours_load || 0), 0);
  const totalRev = active.reduce((s, m) => s + monthlyRevenue(m), 0);
  const totalMargin = active.reduce((s, m) => s + monthlyMargin(m), 0);
  const avgMargH = totalHours > 0 ? totalMargin / totalHours : 0;
  const lowMargin = active.filter((m) => marginPerHour(m) < 20).length;
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
