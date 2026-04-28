import { listPeople, listEntries } from "@/lib/data/leadgen";
import { MONTHS, activeMonths, inRange, monthKey, shortMonth } from "@/lib/months";
import { catMeta } from "@/components/leadgen/categories";
import { PeriodFilter } from "@/components/leadgen/period-filter";

export const dynamic = "force-dynamic";

type SP = Promise<{ fm?: string; fy?: string; tm?: string; ty?: string }>;

export default async function MonthsView({
  searchParams,
}: {
  searchParams: SP;
}) {
  const [people, entries] = await Promise.all([
    listPeople(),
    listEntries(),
  ]);

  const peopleById = new Map(people.map((p) => [p.id, p.name]));
  const allPositive = entries.filter((e) => (e.bonus || 0) > 0);

  const yearsList = Array.from(
    new Set(allPositive.map((e) => e.year ?? 2026)),
  ).sort((a, b) => a - b);
  const minYear = yearsList[0] ?? new Date().getFullYear();
  const maxYear = yearsList[yearsList.length - 1] ?? minYear;

  const sp = await searchParams;
  const fM = sp.fm && (MONTHS as readonly string[]).includes(sp.fm) ? sp.fm : null;
  const fY = sp.fy ? Number(sp.fy) : null;
  const tM = sp.tm && (MONTHS as readonly string[]).includes(sp.tm) ? sp.tm : null;
  const tY = sp.ty ? Number(sp.ty) : null;
  const positive =
    fM && fY && tM && tY
      ? (() => {
          const swap = monthKey(fM, fY) > monthKey(tM, tY);
          const f1 = swap ? tM : fM;
          const y1 = swap ? tY : fY;
          const f2 = swap ? fM : tM;
          const y2 = swap ? fY : tY;
          return allPositive.filter((e) =>
            inRange(e.month, e.year ?? 2026, f1, y1, f2, y2),
          );
        })()
      : allPositive;

  // Each unique (month, year) pair sorted chronologically
  const periods = activeMonths(
    positive.map((e) => ({ month: e.month, year: e.year ?? 2026 })),
  );

  // Pre-aggregate per period
  const blocks = periods.map(({ month, year }) => {
    const periodEntries = positive.filter(
      (e) => e.month === month && (e.year ?? 2026) === year,
    );
    const byPerson = new Map<string, number>();
    for (const e of periodEntries) {
      byPerson.set(
        e.person_id,
        (byPerson.get(e.person_id) ?? 0) + e.bonus,
      );
    }
    const rows = Array.from(byPerson.entries())
      .map(([pid, val]) => ({ name: peopleById.get(pid) ?? "?", val }))
      .sort((a, b) => b.val - a.val);
    const total = rows.reduce((s, r) => s + r.val, 0);
    const max = rows[0]?.val ?? 0;

    // cat breakdown
    const byCat: Record<string, number> = {};
    for (const e of periodEntries) {
      byCat[e.cat] = (byCat[e.cat] || 0) + e.bonus;
    }

    return { month, year, rows, total, max, byCat };
  });

  return (
    <div className="space-y-5">
      <PeriodFilter
        availableYears={yearsList.length > 0 ? yearsList : [minYear, maxYear]}
        defaultFromMonth={MONTHS[0]}
        defaultFromYear={minYear}
        defaultToMonth={MONTHS[11]}
        defaultToYear={maxYear}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {blocks.map((b) => (
        <article
          key={`${b.year}-${b.month}`}
          className="rounded-md border bg-card overflow-hidden"
        >
          <header className="flex items-center justify-between p-4 border-b">
            <h2 className="font-display text-2xl tracking-wide leading-none">
              {shortMonth(b.month, b.year)}
            </h2>
            <div className="text-right">
              <div className="font-display text-2xl text-primary leading-none">
                ${b.total.toLocaleString("en-US")}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                {b.rows.length} участников
              </div>
            </div>
          </header>

          {/* category strip */}
          {Object.keys(b.byCat).length > 0 ? (
            <div className="flex h-1.5 border-b">
              {Object.entries(b.byCat)
                .filter(([, v]) => v > 0)
                .map(([cat, v]) => {
                  const meta = catMeta(cat);
                  const pct = (v / b.total) * 100;
                  return (
                    <div
                      key={cat}
                      title={`${meta.label}: $${v}`}
                      className={meta.bg.replace("/30", "")}
                      style={{ width: `${pct}%` }}
                    />
                  );
                })}
            </div>
          ) : null}

          <ul className="divide-y divide-border">
            {b.rows.map((r) => {
              const pct = b.max === 0 ? 0 : (r.val / b.max) * 100;
              return (
                <li key={r.name} className="px-4 py-2">
                  <div className="flex items-baseline justify-between font-mono text-sm">
                    <span className="text-foreground truncate">{r.name}</span>
                    <span className="text-muted-foreground">${r.val}</span>
                  </div>
                  <div className="mt-1 h-1 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
      </div>
      {blocks.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground py-12 text-center">
          Нет данных в выбранном периоде
        </p>
      ) : null}
    </div>
  );
}
