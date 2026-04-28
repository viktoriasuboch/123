import { listPeople, listEntries } from "@/lib/data/leadgen";
import {
  MONTHS,
  activeMonths,
  shortMonth,
  monthColor,
} from "@/lib/months";
import { catMeta, CAT_KEYS } from "@/components/leadgen/categories";

export const dynamic = "force-dynamic";

export default async function SummaryView() {
  const [people, entries] = await Promise.all([
    listPeople(),
    listEntries(),
  ]);
  const positive = entries.filter((e) => (e.bonus || 0) > 0);
  const peopleById = new Map(people.map((p) => [p.id, p.name]));

  // Active periods for leaderboard columns
  const activePairs = activeMonths(
    positive.map((e) => ({ month: e.month, year: e.year ?? 2026 })),
  );

  // Pick the year used in the all-12-months KPI grid: most-frequent year, falls
  // back to current.
  const yearCounts = new Map<number, number>();
  for (const e of positive) {
    const y = e.year ?? 2026;
    yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
  }
  let mainYear = new Date().getFullYear();
  let max = -1;
  for (const [y, c] of yearCounts) {
    if (c > max) {
      max = c;
      mainYear = y;
    }
  }

  const total = positive.reduce((s, e) => s + e.bonus, 0);
  const totalsByCat: Record<string, number> = {};
  for (const k of CAT_KEYS) totalsByCat[k] = 0;
  for (const e of positive)
    totalsByCat[e.cat] = (totalsByCat[e.cat] || 0) + e.bonus;

  const monthTotal = (m: string, y: number) =>
    positive
      .filter((e) => e.month === m && (e.year ?? 2026) === y)
      .reduce((s, e) => s + e.bonus, 0);

  const personRow = (pid: string) => {
    const own = positive.filter((e) => e.person_id === pid);
    const t = own.reduce((s, e) => s + e.bonus, 0);
    const perPeriod = activePairs.map(({ month, year }) =>
      own
        .filter((e) => e.month === month && (e.year ?? 2026) === year)
        .reduce((s, e) => s + e.bonus, 0),
    );
    return { name: peopleById.get(pid) ?? "?", total: t, perPeriod };
  };

  const personTotals = Array.from(new Set(positive.map((e) => e.person_id)))
    .map(personRow)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-7">
      {/* Top KPIs: total + headcount + per-category */}
      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Всего выплачено" value={`$${total.toLocaleString("en-US")}`} accent />
        <Kpi label="Участников" value={personTotals.length.toString()} />
        {CAT_KEYS.map((k) => {
          const meta = catMeta(k);
          return (
            <Kpi
              key={k}
              label={meta.label}
              value={`$${(totalsByCat[k] || 0).toLocaleString("en-US")}`}
              colorVar={
                k === "closed"
                  ? "var(--good)"
                  : k === "calls"
                    ? "var(--info)"
                    : k === "special"
                      ? "var(--warn)"
                      : k === "mentoring"
                        ? "var(--special)"
                        : "var(--good)"
              }
            />
          );
        })}
      </section>

      {/* All 12 months KPIs, colored */}
      <section>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {MONTHS.map((m) => (
            <Kpi
              key={m}
              label={m}
              value={`$${monthTotal(m, mainYear).toLocaleString("en-US")}`}
              colorVar={monthColor(m)}
            />
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <h2 className="font-display text-2xl tracking-wide text-muted-foreground mb-3">
          Рейтинг за все {activePairs.length}{" "}
          {activePairs.length === 1
            ? "месяц"
            : activePairs.length < 5
              ? "месяца"
              : "месяцев"}
        </h2>
        <div className="rounded-md border bg-card overflow-x-auto">
          <table className="w-full text-sm font-mono min-w-[640px]">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.15em] border-b">
                <th className="text-left p-3 font-normal w-8 text-muted-foreground">
                  #
                </th>
                <th className="text-left p-3 font-normal text-muted-foreground">
                  Имя
                </th>
                {activePairs.map(({ month, year }) => (
                  <th
                    key={`${year}-${month}`}
                    className="text-right p-3 font-normal whitespace-nowrap"
                    style={{ color: monthColor(month) }}
                  >
                    {shortMonth(month, year)}
                  </th>
                ))}
                <th className="text-right p-3 font-normal text-primary">Итого</th>
              </tr>
            </thead>
            <tbody>
              {personTotals.map((r, idx) => (
                <tr
                  key={r.name}
                  className="border-b border-border/40 hover:bg-muted/20"
                >
                  <td className="p-3 font-display text-base text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="p-3 text-foreground font-semibold">{r.name}</td>
                  {r.perPeriod.map((v, i) => {
                    const m = activePairs[i].month;
                    return (
                      <td
                        key={i}
                        className="p-3 text-right"
                        style={{
                          color: v > 0 ? monthColor(m) : "var(--muted-foreground)",
                          opacity: v > 0 ? 1 : 0.35,
                        }}
                      >
                        {v > 0 ? `$${v}` : "—"}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right font-display text-primary text-base">
                    ${r.total.toLocaleString("en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  colorVar,
}: {
  label: string;
  value: string;
  accent?: boolean;
  colorVar?: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3 min-w-0">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 truncate">
        {label}
      </div>
      <div
        className="font-display text-2xl leading-none truncate"
        style={
          accent
            ? { color: "var(--primary)" }
            : colorVar
              ? { color: colorVar }
              : undefined
        }
      >
        {value}
      </div>
    </div>
  );
}
