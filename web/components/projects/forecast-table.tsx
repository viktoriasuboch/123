import Link from "next/link";
import type { Project, ProjectMember, ProjectRevenue } from "@/lib/schemas";
import {
  BASELINE_MONTH_HOURS,
  nextMonths,
  ruMonthShort,
} from "@/lib/working-days";
import { MoneyValue } from "./money-value";
import { MONTHS } from "@/lib/months";

const MONTHS_AHEAD = 6;

type Cell = {
  forecast: number;
  actual: number | null;
};

type ProjectRow = {
  project: Project;
  cells: Cell[];
  forecastTotal: number;
  actualTotal: number;
};

export function ForecastTable({
  activeProjects,
  membersByProject,
  revenues,
}: {
  activeProjects: Project[];
  membersByProject: Map<string, ProjectMember[]>;
  revenues: ProjectRevenue[];
}) {
  const now = new Date();
  const months = nextMonths(
    { year: now.getFullYear(), month: now.getMonth() },
    MONTHS_AHEAD,
  );

  // index revenues by (project_name_lower, year, month-name)
  const revIdx = new Map<string, number>();
  for (const r of revenues) {
    const key = `${r.project_name.toLowerCase()}|${r.year ?? 0}|${r.month}`;
    revIdx.set(key, (revIdx.get(key) ?? 0) + Number(r.amount));
  }

  // build rows
  const rows: ProjectRow[] = [];
  for (const p of activeProjects) {
    const ms = (membersByProject.get(p.id) ?? []).filter(
      (m) => m.is_active !== false,
    );
    const cells: Cell[] = months.map((mo) => {
      // per-member forecast: sell_rate × (member.hours_load / baseline) × workingHours
      let forecast = 0;
      for (const m of ms) {
        const hrsFactor = (m.hours_load ?? 0) / BASELINE_MONTH_HOURS;
        forecast += (m.sell_rate ?? 0) * hrsFactor * mo.workingHours;
      }
      const key = `${p.name.toLowerCase()}|${mo.year}|${MONTHS[mo.month]}`;
      const actual = revIdx.has(key) ? revIdx.get(key)! : null;
      return { forecast, actual };
    });
    const forecastTotal = cells.reduce((s, c) => s + c.forecast, 0);
    const actualTotal = cells.reduce(
      (s, c) => s + (c.actual ?? 0),
      0,
    );
    if (forecastTotal === 0 && actualTotal === 0) continue;
    rows.push({ project: p, cells, forecastTotal, actualTotal });
  }
  rows.sort((a, b) => b.forecastTotal - a.forecastTotal);

  // totals per month
  const monthForecast = months.map((_, i) =>
    rows.reduce((s, r) => s + r.cells[i].forecast, 0),
  );
  const monthActual = months.map((_, i) =>
    rows.reduce((s, r) => s + (r.cells[i].actual ?? 0), 0),
  );
  const monthHasActual = months.map((_, i) =>
    rows.some((r) => r.cells[i].actual !== null),
  );

  return (
    <section className="rounded-md border bg-card overflow-x-auto">
      <header className="p-4 border-b flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display text-xl tracking-wide">
          Forecast · ближайшие {MONTHS_AHEAD} мес
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          прогноз = sell × hours_load × раб.часов / 160
        </p>
      </header>
      <table className="w-full text-sm font-mono min-w-[1100px]">
        <colgroup>
          <col className="w-[220px]" />
          {months.map((_, i) => (
            <col key={i} />
          ))}
          <col className="w-[110px]" />
        </colgroup>
        <thead>
          <tr className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground border-b">
            <th className="text-left p-2 font-normal">Проект</th>
            {months.map((mo) => (
              <th
                key={`${mo.year}-${mo.month}`}
                className="text-center p-2 font-normal"
              >
                <div>{ruMonthShort(mo.month, mo.year)}</div>
                <div className="text-[8px] text-muted-foreground/70 normal-case mt-0.5">
                  {mo.workingDays} дн · {mo.workingHours} ч
                </div>
              </th>
            ))}
            <th className="text-center p-2 font-normal">Σ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={months.length + 2}
                className="p-6 text-center text-muted-foreground text-xs"
              >
                Нет проектов с прогнозируемой выручкой
              </td>
            </tr>
          ) : null}
          {rows.map((r) => (
            <tr
              key={r.project.id}
              className="border-b border-border/50 hover:bg-muted/20 transition"
            >
              <td className="p-2 truncate">
                <Link
                  href={`/projects/${r.project.id}`}
                  className="hover:text-primary"
                >
                  {r.project.name}
                </Link>
              </td>
              {r.cells.map((c, i) => (
                <td key={i} className="p-2 text-center">
                  <ForecastCell cell={c} />
                </td>
              ))}
              <td className="p-2 text-center text-info">
                <MoneyValue value={`$${fmt(r.forecastTotal)}`} />
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 ? (
          <tfoot>
            <tr className="border-t border-border/60">
              <td className="p-2 text-muted-foreground uppercase tracking-[0.15em] text-[10px]">
                Σ Прогноз
              </td>
              {monthForecast.map((v, i) => (
                <td key={i} className="p-2 text-center text-info">
                  <MoneyValue value={`$${fmt(v)}`} />
                </td>
              ))}
              <td className="p-2 text-center text-info font-semibold">
                <MoneyValue
                  value={`$${fmt(monthForecast.reduce((s, x) => s + x, 0))}`}
                />
              </td>
            </tr>
            <tr>
              <td className="p-2 text-muted-foreground uppercase tracking-[0.15em] text-[10px]">
                Σ Факт
              </td>
              {monthActual.map((v, i) => (
                <td key={i} className="p-2 text-center">
                  {monthHasActual[i] ? (
                    <span className="text-good">
                      <MoneyValue value={`$${fmt(v)}`} />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              ))}
              <td className="p-2 text-center text-good font-semibold">
                <MoneyValue
                  value={`$${fmt(monthActual.reduce((s, x) => s + x, 0))}`}
                />
              </td>
            </tr>
            <tr>
              <td className="p-2 text-muted-foreground uppercase tracking-[0.15em] text-[10px]">
                % выполнения
              </td>
              {monthForecast.map((forecast, i) => {
                const actual = monthActual[i];
                if (!monthHasActual[i]) {
                  return (
                    <td key={i} className="p-2 text-center text-muted-foreground">
                      —
                    </td>
                  );
                }
                const pct = forecast > 0 ? (actual / forecast) * 100 : 0;
                const cls =
                  pct >= 100
                    ? "text-good"
                    : pct >= 80
                      ? "text-warn"
                      : "text-bad";
                return (
                  <td key={i} className={`p-2 text-center ${cls}`}>
                    {pct.toFixed(0)}%
                  </td>
                );
              })}
              <td className="p-2 text-center text-muted-foreground">—</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </section>
  );
}

function ForecastCell({ cell }: { cell: Cell }) {
  if (cell.forecast === 0 && cell.actual === null) {
    return <span className="text-muted-foreground/40">—</span>;
  }
  return (
    <div className="leading-tight">
      <div className="text-info">
        <MoneyValue value={`$${fmt(cell.forecast)}`} />
      </div>
      {cell.actual !== null ? (
        <div
          className={
            cell.actual >= cell.forecast
              ? "text-good text-[10px]"
              : "text-warn text-[10px]"
          }
        >
          ф: <MoneyValue value={`$${fmt(cell.actual)}`} />
        </div>
      ) : null}
    </div>
  );
}

function fmt(v: number) {
  return Math.round(v).toLocaleString("en-US");
}
