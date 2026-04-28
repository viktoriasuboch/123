import {
  listDeals,
  listPeople,
  listProjectRevenues,
} from "@/lib/data/leadgen";
import { DealsFilters } from "@/components/leadgen/deals-filters";
import { DealsTable } from "@/components/leadgen/deals-table";
import { NewDealButton } from "@/components/leadgen/new-deal-button";
import { ImportDealsButton } from "@/components/leadgen/import-deals-button";
import type { Deal } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type SP = Promise<{ type?: string; lg?: string; yr?: string; mo?: string }>;

export default async function DealsView({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const type = sp.type === "closed" ? "closed" : "sql";
  const lg = sp.lg ?? "all";
  const yr = sp.yr ?? "all";
  const mo = sp.mo ?? "all";

  const [deals, people, revenues] = await Promise.all([
    listDeals(),
    listPeople(),
    listProjectRevenues(),
  ]);

  // Available filter options computed from raw data (not after-filter)
  const sameType = deals.filter((d) => (d.deal_type ?? "sql") === type);
  const leadgenOptions = Array.from(
    new Set(sameType.map((d) => d.leadgen).filter((n): n is string => !!n)),
  ).sort((a, b) => a.localeCompare(b, "ru"));
  const yearOptions = Array.from(
    new Set(sameType.map((d) => d.year ?? 2026)),
  ).sort((a, b) => a - b);
  const monthOptions = Array.from(
    new Set(
      sameType
        .filter((d) => yr === "all" || (d.year ?? 2026) === Number(yr))
        .map((d) => d.month),
    ),
  );

  // Apply filters
  const filtered = sameType.filter((d) => {
    if (lg !== "all" && d.leadgen !== lg) return false;
    if (yr !== "all" && (d.year ?? 2026) !== Number(yr)) return false;
    if (mo !== "all" && d.month !== mo) return false;
    return true;
  });

  // Group by project (case-insensitive)
  const groupsMap = new Map<string, { project: string; deals: Deal[]; total: number }>();
  for (const d of filtered) {
    const key = d.project.toLowerCase().trim();
    const ex = groupsMap.get(key);
    if (ex) {
      ex.deals.push(d);
      ex.total += d.bonus;
    } else {
      groupsMap.set(key, { project: d.project, deals: [d], total: d.bonus });
    }
  }
  const groups = Array.from(groupsMap.values()).sort((a, b) => b.total - a.total);

  // Auto-revenue lookup: project|month|year → amount
  const revenueLookup = new Map<string, number>();
  for (const r of revenues) {
    revenueLookup.set(
      `${r.project_name.toLowerCase()}|${r.month}|${r.year ?? 2026}`,
      r.amount,
    );
  }

  // Stats
  const totalBonus = filtered.reduce((s, d) => s + d.bonus, 0);
  const totalRevenue = filtered.reduce((s, d) => {
    const v = d.revenue
      ? Number(d.revenue)
      : revenueLookup.get(
          `${d.project.toLowerCase()}|${d.month}|${d.year ?? 2026}`,
        ) ?? 0;
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  const uniqueLeadgens = new Set(filtered.map((d) => d.leadgen).filter(Boolean)).size;
  const avgBonus = filtered.length > 0 ? totalBonus / filtered.length : 0;

  const peopleNames = people.map((p) => p.name);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display text-2xl tracking-wide">Сделки</h2>
        <div className="flex gap-2 flex-wrap">
          <ImportDealsButton defaultType={type as "sql" | "closed"} />
          <NewDealButton
            leadgenNames={peopleNames}
            yearOptions={yearOptions.length > 0 ? yearOptions : [2025, 2026, 2027]}
            defaultType={type as "sql" | "closed"}
          />
        </div>
      </div>

      <DealsFilters
        leadgenOptions={leadgenOptions}
        yearOptions={yearOptions}
        monthOptions={monthOptions}
      />

      <div className="rounded-md border bg-card/60 p-4 mb-5 flex flex-wrap gap-4 items-center">
        <Cell label="Сделок" value={filtered.length.toString()} />
        <Cell label="Бонусы" value={`$${totalBonus.toLocaleString("en-US")}`} accent />
        <Cell
          label="Revenue"
          value={`$${Math.round(totalRevenue).toLocaleString("en-US")}`}
          tone="info"
        />
        <Cell label="Leadgen" value={uniqueLeadgens.toString()} />
        <Cell label="Ср. бонус" value={`$${Math.round(avgBonus)}`} tone="warn" />
      </div>

      <DealsTable
        groups={groups}
        leadgenNames={peopleNames}
        yearOptions={yearOptions.length > 0 ? yearOptions : [2025, 2026, 2027]}
        revenueLookup={revenueLookup}
      />
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "info" | "warn";
}) {
  const cls = accent
    ? "text-primary"
    : tone === "info"
      ? "text-info"
      : tone === "warn"
        ? "text-warn"
        : "text-foreground";
  return (
    <div className="min-w-[110px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-display text-xl leading-none ${cls}`}>{value}</div>
    </div>
  );
}
