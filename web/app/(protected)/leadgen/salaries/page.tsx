import { listSalaries } from "@/lib/data/leadgen";
import { MONTHS, activeMonths, inRange, monthKey, shortMonth } from "@/lib/months";
import { PeriodFilter } from "@/components/leadgen/period-filter";

export const dynamic = "force-dynamic";

type Row = {
  name: string;
  perPeriod: Map<string, { gross: number; total: number }>;
  avgGross: number;
  avgTotal: number;
};

type SP = Promise<{ fm?: string; fy?: string; tm?: string; ty?: string }>;

export default async function SalariesView({
  searchParams,
}: {
  searchParams: SP;
}) {
  const salariesAll = await listSalaries();

  const years = Array.from(
    new Set(salariesAll.map((s) => s.year)),
  ).sort((a, b) => a - b);
  const minYear = years[0] ?? new Date().getFullYear();
  const maxYear = years[years.length - 1] ?? minYear;

  const sp = await searchParams;
  const fM = sp.fm && (MONTHS as readonly string[]).includes(sp.fm) ? sp.fm : null;
  const fY = sp.fy ? Number(sp.fy) : null;
  const tM = sp.tm && (MONTHS as readonly string[]).includes(sp.tm) ? sp.tm : null;
  const tY = sp.ty ? Number(sp.ty) : null;
  const filtered =
    fM && fY && tM && tY
      ? (() => {
          const swap = monthKey(fM, fY) > monthKey(tM, tY);
          const f1 = swap ? tM : fM;
          const y1 = swap ? tY : fY;
          const f2 = swap ? fM : tM;
          const y2 = swap ? fY : tY;
          return salariesAll.filter((s) =>
            inRange(s.month, s.year, f1, y1, f2, y2),
          );
        })()
      : salariesAll;

  const periods = activeMonths(
    filtered.map((s) => ({ month: s.month, year: s.year })),
  );

  // group by name
  const byName = new Map<string, Row>();
  for (const s of filtered) {
    if (!byName.has(s.leadgen_name)) {
      byName.set(s.leadgen_name, {
        name: s.leadgen_name,
        perPeriod: new Map(),
        avgGross: 0,
        avgTotal: 0,
      });
    }
    const r = byName.get(s.leadgen_name)!;
    const k = `${s.year}-${s.month}`;
    const prev = r.perPeriod.get(k);
    r.perPeriod.set(k, {
      gross: (prev?.gross ?? 0) + s.gross,
      total: (prev?.total ?? 0) + s.total,
    });
  }

  // averages
  for (const r of byName.values()) {
    const periodCount = r.perPeriod.size || 1;
    let totalGross = 0,
      totalNet = 0;
    for (const v of r.perPeriod.values()) {
      totalGross += v.gross;
      totalNet += v.total;
    }
    r.avgGross = totalGross / periodCount;
    r.avgTotal = totalNet / periodCount;
  }

  const rows = Array.from(byName.values()).sort((a, b) => b.avgTotal - a.avgTotal);

  // column totals (к выплате per period across people)
  const colTotals = periods.map(({ month, year }) => {
    const k = `${year}-${month}`;
    let s = 0;
    for (const r of rows) s += r.perPeriod.get(k)?.total ?? 0;
    return s;
  });

  // KPIs
  const grandTotal = colTotals.reduce((s, v) => s + v, 0);
  const maxGross = Math.max(0, ...rows.map((r) => r.avgGross));
  const maxMonthly = Math.max(0, ...colTotals);

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl tracking-wide">Зарплаты Leadgen</h2>

      <PeriodFilter
        availableYears={years.length > 0 ? years : [minYear, maxYear]}
        defaultFromMonth={MONTHS[0]}
        defaultFromYear={minYear}
        defaultToMonth={MONTHS[11]}
        defaultToYear={maxYear}
      />

      <div className="rounded-md border bg-card/60 p-4 flex flex-wrap gap-4">
        <Kpi label="Всего к выплате" value={`$${Math.round(grandTotal).toLocaleString("en-US")}`} accent />
        <Kpi label="Участников" value={rows.length.toString()} />
        <Kpi label="Периодов" value={periods.length.toString()} />
        <Kpi label="Макс. ср. gross" value={`$${Math.round(maxGross).toLocaleString("en-US")}`} tone="info" />
        <Kpi
          label="Макс. месяц"
          value={`$${Math.round(maxMonthly).toLocaleString("en-US")}`}
          tone="warn"
        />
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
                <th className="text-left p-3 font-normal w-8">#</th>
                <th className="text-left p-3 font-normal">Имя</th>
                {periods.map(({ month, year }) => (
                  <th
                    key={`${year}-${month}`}
                    className="text-right p-3 font-normal whitespace-nowrap"
                  >
                    {shortMonth(month, year)}
                  </th>
                ))}
                <th className="text-right p-3 font-normal whitespace-nowrap">Ср. gross</th>
                <th className="text-right p-3 font-normal whitespace-nowrap">Ср. к выплате</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.name}
                  className="border-b border-border/40 hover:bg-muted/20"
                >
                  <td className="p-3 font-display text-base text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="p-3 text-foreground">{r.name}</td>
                  {periods.map(({ month, year }) => {
                    const k = `${year}-${month}`;
                    const v = r.perPeriod.get(k);
                    return (
                      <td
                        key={k}
                        className={`p-3 text-right ${v ? "text-foreground" : "text-muted-foreground/40"}`}
                        title={v ? `gross: $${v.gross}` : ""}
                      >
                        {v ? `$${Math.round(v.total).toLocaleString("en-US")}` : "—"}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right text-info">
                    ${Math.round(r.avgGross).toLocaleString("en-US")}
                  </td>
                  <td className="p-3 text-right font-display text-primary text-base">
                    ${Math.round(r.avgTotal).toLocaleString("en-US")}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/20">
                <td colSpan={2} className="p-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Итого по месяцу
                </td>
                {colTotals.map((v, i) => (
                  <td key={i} className="p-3 text-right font-display text-base">
                    ${Math.round(v).toLocaleString("en-US")}
                  </td>
                ))}
                <td colSpan={2}></td>
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
    <div className="min-w-[120px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-display text-xl leading-none ${cls}`}>{value}</div>
    </div>
  );
}
