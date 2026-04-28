import { listProjectRevenues } from "@/lib/data/leadgen";
import { MONTHS, activeMonths, inRange, monthKey, shortMonth } from "@/lib/months";
import { PeriodFilter } from "@/components/leadgen/period-filter";
import { NewRevenueButton } from "@/components/leadgen/new-revenue-button";
import { RevenueRowDelete } from "@/components/leadgen/revenue-row-delete";
import type { ProjectRevenue } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type ProjectRow = {
  project: string;
  perPeriod: Map<string, ProjectRevenue[]>;
  total: number;
};

type SP = Promise<{ fm?: string; fy?: string; tm?: string; ty?: string }>;

export default async function RevenueView({
  searchParams,
}: {
  searchParams: SP;
}) {
  const revenuesAll = await listProjectRevenues();

  const sp = await searchParams;
  const fM = sp.fm && (MONTHS as readonly string[]).includes(sp.fm) ? sp.fm : null;
  const fY = sp.fy ? Number(sp.fy) : null;
  const tM = sp.tm && (MONTHS as readonly string[]).includes(sp.tm) ? sp.tm : null;
  const tY = sp.ty ? Number(sp.ty) : null;
  const revenues =
    fM && fY && tM && tY
      ? (() => {
          const swap = monthKey(fM, fY) > monthKey(tM, tY);
          const f1 = swap ? tM : fM;
          const y1 = swap ? tY : fY;
          const f2 = swap ? fM : tM;
          const y2 = swap ? fY : tY;
          return revenuesAll.filter((r) =>
            inRange(r.month, r.year ?? 2026, f1, y1, f2, y2),
          );
        })()
      : revenuesAll;

  const periods = activeMonths(
    revenues.map((r) => ({ month: r.month, year: r.year ?? 2026 })),
  );

  // group by project
  const byProject = new Map<string, ProjectRow>();
  for (const r of revenues) {
    if (!byProject.has(r.project_name)) {
      byProject.set(r.project_name, {
        project: r.project_name,
        perPeriod: new Map(),
        total: 0,
      });
    }
    const row = byProject.get(r.project_name)!;
    const k = `${r.year ?? 2026}-${r.month}`;
    const list = row.perPeriod.get(k) ?? [];
    list.push(r);
    row.perPeriod.set(k, list);
    row.total += r.amount;
  }

  const rows = Array.from(byProject.values()).sort((a, b) => b.total - a.total);

  // column totals
  const colTotals = periods.map(({ month, year }) => {
    const k = `${year}-${month}`;
    let s = 0;
    for (const r of rows) {
      const list = r.perPeriod.get(k) ?? [];
      s += list.reduce((acc, e) => acc + e.amount, 0);
    }
    return s;
  });

  const grandTotal = colTotals.reduce((s, v) => s + v, 0);
  const top = rows[0];

  const yearOptions = Array.from(
    new Set([
      ...revenues.map((r) => r.year ?? 2026),
      new Date().getFullYear(),
    ]),
  ).sort((a, b) => a - b);

  const minYear = yearOptions[0] ?? new Date().getFullYear();
  const maxYear = yearOptions[yearOptions.length - 1] ?? minYear;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl tracking-wide">Project Revenue</h2>
        <NewRevenueButton yearOptions={yearOptions} />
      </div>

      <PeriodFilter
        availableYears={yearOptions}
        defaultFromMonth={MONTHS[0]}
        defaultFromYear={minYear}
        defaultToMonth={MONTHS[11]}
        defaultToYear={maxYear}
      />

      <div className="rounded-md border bg-card/60 p-4 flex flex-wrap gap-4">
        <Kpi label="Всего ревеню" value={`$${Math.round(grandTotal).toLocaleString("en-US")}`} accent />
        <Kpi label="Проектов" value={rows.length.toString()} />
        <Kpi label="Периодов" value={periods.length.toString()} />
        {top ? (
          <Kpi
            label={`Топ: ${top.project}`}
            value={`$${Math.round(top.total).toLocaleString("en-US")}`}
            tone="info"
          />
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground py-12 text-center">
          Нет данных
        </p>
      ) : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <table className="w-full text-sm font-mono min-w-[640px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground border-b">
                <th className="text-left p-3 font-normal">Проект</th>
                {periods.map(({ month, year }) => (
                  <th
                    key={`${year}-${month}`}
                    className="text-right p-3 font-normal whitespace-nowrap"
                  >
                    {shortMonth(month, year)}
                  </th>
                ))}
                <th className="text-right p-3 font-normal">Итого</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.project} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="p-3 text-foreground">{r.project}</td>
                  {periods.map(({ month, year }) => {
                    const k = `${year}-${month}`;
                    const entries = r.perPeriod.get(k) ?? [];
                    const sum = entries.reduce((s, e) => s + e.amount, 0);
                    if (entries.length === 0)
                      return (
                        <td key={k} className="p-3 text-right text-muted-foreground/40">
                          —
                        </td>
                      );
                    const tooltip = entries
                      .map((e) => `${e.note ? e.note + ": " : ""}$${e.amount}`)
                      .join("\n");
                    return (
                      <td key={k} className="p-3 text-right" title={tooltip}>
                        <span className="text-foreground">
                          ${Math.round(sum).toLocaleString("en-US")}
                        </span>
                        <span className="ml-1.5 inline-flex gap-0.5">
                          {entries.map((e) => (
                            <RevenueRowDelete
                              key={e.id}
                              id={e.id}
                              label={`${r.project} ${shortMonth(e.month, e.year ?? 2026)} $${e.amount}`}
                            />
                          ))}
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right font-display text-primary text-base">
                    ${Math.round(r.total).toLocaleString("en-US")}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/20">
                <td className="p-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Итого
                </td>
                {colTotals.map((v, i) => (
                  <td key={i} className="p-3 text-right font-display text-base">
                    ${Math.round(v).toLocaleString("en-US")}
                  </td>
                ))}
                <td className="p-3 text-right font-display text-primary text-lg">
                  ${Math.round(grandTotal).toLocaleString("en-US")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "info";
}) {
  const cls = accent ? "text-primary" : tone === "info" ? "text-info" : "text-foreground";
  return (
    <div className="min-w-[140px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1 truncate">
        {label}
      </div>
      <div className={`font-display text-xl leading-none ${cls}`}>{value}</div>
    </div>
  );
}
