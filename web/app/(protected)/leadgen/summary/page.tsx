import { listPeople, listEntries } from "@/lib/data/leadgen";
import { activeMonths, shortMonth } from "@/lib/months";
import { catMeta, CAT_KEYS } from "@/components/leadgen/categories";

export const dynamic = "force-dynamic";

export default async function SummaryView() {
  const [people, entries] = await Promise.all([
    listPeople(),
    listEntries(),
  ]);
  const positive = entries.filter((e) => (e.bonus || 0) > 0);
  const peopleById = new Map(people.map((p) => [p.id, p.name]));

  const total = positive.reduce((s, e) => s + e.bonus, 0);
  const totalsByCat: Record<string, number> = {};
  for (const k of CAT_KEYS) totalsByCat[k] = 0;
  for (const e of positive)
    totalsByCat[e.cat] = (totalsByCat[e.cat] || 0) + e.bonus;

  const periods = activeMonths(
    positive.map((e) => ({ month: e.month, year: e.year ?? 2026 })),
  );

  const monthTotal = (m: string, y: number) =>
    positive
      .filter((e) => e.month === m && (e.year ?? 2026) === y)
      .reduce((s, e) => s + e.bonus, 0);

  const personRow = (pid: string) => {
    const own = positive.filter((e) => e.person_id === pid);
    const t = own.reduce((s, e) => s + e.bonus, 0);
    const perPeriod = periods.map(({ month, year }) =>
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
    <div className="space-y-6">
      {/* KPI grid: grand + categories + per-month */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Сводка
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Kpi label="Всего бонусов" value={`$${total.toLocaleString("en-US")}`} accent />
          <Kpi label="Участников" value={personTotals.length.toString()} />
          {CAT_KEYS.filter((k) => totalsByCat[k] > 0).map((k) => {
            const meta = catMeta(k);
            return (
              <Kpi
                key={k}
                label={meta.label}
                value={`$${totalsByCat[k].toLocaleString("en-US")}`}
                cls={meta.text}
              />
            );
          })}
        </div>
      </section>

      {periods.length > 0 ? (
        <section>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            По месяцам
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {periods.map(({ month, year }) => (
              <Kpi
                key={`${year}-${month}`}
                label={shortMonth(month, year)}
                value={`$${monthTotal(month, year).toLocaleString("en-US")}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Ranking */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Лидерборд
        </h2>
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
                <th className="text-right p-3 font-normal">Итого</th>
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
                  <td className="p-3 text-foreground">{r.name}</td>
                  {r.perPeriod.map((v, i) => (
                    <td
                      key={i}
                      className={`p-3 text-right ${v > 0 ? "text-foreground" : "text-muted-foreground/40"}`}
                    >
                      {v > 0 ? `$${v}` : "—"}
                    </td>
                  ))}
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
  cls,
}: {
  label: string;
  value: string;
  accent?: boolean;
  cls?: string;
}) {
  const colorCls = cls ?? (accent ? "text-primary" : "text-foreground");
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 truncate">
        {label}
      </div>
      <div className={`font-display text-xl leading-none ${colorCls}`}>
        {value}
      </div>
    </div>
  );
}
