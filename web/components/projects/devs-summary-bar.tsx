import type { Project, ProjectMember } from "@/lib/schemas";
import type { DevCardEntry } from "@/components/projects/dev-card";
import { buyRate, monthlyRevenue, monthlyMargin } from "@/lib/calc";
import type { DevFilterId } from "@/components/projects/projects-filters";

const FILTER_LABEL: Record<DevFilterId, string> = {
  all: "Все разработчики",
  staff: "Только штатные",
  freelancer: "Только фрилансеры",
  fired: "Уволенные",
};

export function DevsSummaryBar({
  projects,
  members,
  devEntries,
  filter,
}: {
  projects: Project[];
  members: ProjectMember[];
  devEntries: DevCardEntry[];
  filter: DevFilterId;
}) {
  // Find the set of dev names that match the current filter
  const includedNames = new Set(
    devEntries
      .filter((d) => {
        if (filter === "fired") return d.fired;
        if (d.fired) return false;
        if (filter === "staff") return d.empType === "staff";
        if (filter === "freelancer") return d.empType !== "staff";
        return true; // all
      })
      .map((d) => d.name),
  );

  const activeIds = new Set(
    projects.filter((p) => (p.status ?? "active") === "active").map((p) => p.id),
  );

  // Filter members: only those of devs in current filter, only on active projects, only active rows
  const a = members.filter(
    (m) =>
      activeIds.has(m.project_id) &&
      m.is_active !== false &&
      includedNames.has(m.dev_name),
  );

  const n = a.length;
  const avgBuy = n === 0 ? 0 : a.reduce((s, m) => s + buyRate(m), 0) / n;
  const avgSell =
    n === 0 ? 0 : a.reduce((s, m) => s + (m.sell_rate || 0), 0) / n;
  const totRev = a.reduce((s, m) => s + monthlyRevenue(m), 0);
  const totMargin = a.reduce((s, m) => s + monthlyMargin(m), 0);

  // Headcount stats
  const totalDevs = devEntries.filter((d) => !d.fired).length;
  const staffDevs = devEntries.filter(
    (d) => !d.fired && d.empType === "staff",
  ).length;
  const freeDevs = devEntries.filter(
    (d) => !d.fired && d.empType !== "staff",
  ).length;
  const firedDevs = devEntries.filter((d) => d.fired).length;

  const headcount = includedNames.size;
  const breakdown =
    filter === "all"
      ? `${staffDevs} штат · ${freeDevs} фриланс${firedDevs > 0 ? ` · ${firedDevs} увол` : ""}`
      : filter === "staff"
        ? `из ${totalDevs} активных`
        : filter === "freelancer"
          ? `из ${totalDevs} активных`
          : `всего уволено`;

  return (
    <div className="rounded-md border bg-card/60 p-4 mb-5 flex flex-wrap gap-4 items-center">
      <Cell
        label="Разработчиков"
        value={headcount.toString()}
        sub={breakdown}
      />
      <Cell label="Ср. buy" value={`$${avgBuy.toFixed(1)}/h`} accent />
      <Cell label="Ср. sell" value={`$${avgSell.toFixed(1)}/h`} tone="good" />
      <Cell label="Rev/мес" value={`$${Math.round(totRev).toLocaleString()}`} />
      <Cell
        label="Маржа/мес"
        value={`$${Math.round(totMargin).toLocaleString()}`}
        tone="info"
      />
      <div className="ml-auto pl-4 border-l border-border font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
        {FILTER_LABEL[filter]} · {n} позиций
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
  accent,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  tone?: "good" | "info";
}) {
  const cls =
    accent
      ? "text-primary"
      : tone === "good"
      ? "text-good"
      : tone === "info"
      ? "text-info"
      : "text-foreground";
  return (
    <div className="min-w-[110px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-display text-xl leading-none ${cls}`}>{value}</div>
      {sub ? (
        <div className="font-mono text-[9px] text-muted-foreground mt-1">{sub}</div>
      ) : null}
    </div>
  );
}
