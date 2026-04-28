import { listPeople, listEntries } from "@/lib/data/leadgen";
import { MONTHS, inRange, monthKey } from "@/lib/months";
import { PeriodFilter } from "@/components/leadgen/period-filter";
import { PersonCard } from "@/components/leadgen/person-card";
import { LeadgenSummary } from "@/components/leadgen/leadgen-summary";

export const dynamic = "force-dynamic";

type SP = Promise<{ fm?: string; fy?: string; tm?: string; ty?: string }>;

export default async function LeadgenPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const [people, entries] = await Promise.all([listPeople(), listEntries()]);

  // Pick available years from data
  const years = Array.from(
    new Set(entries.map((e) => e.year ?? 2026)),
  ).sort((a, b) => a - b);
  const currentYear = years[years.length - 1] ?? new Date().getFullYear();
  const minYear = years[0] ?? currentYear;

  const sp = await searchParams;
  const fromMonth =
    sp.fm && (MONTHS as readonly string[]).includes(sp.fm) ? sp.fm : MONTHS[0];
  const fromYear = Number(sp.fy ?? minYear) || minYear;
  const toMonth =
    sp.tm && (MONTHS as readonly string[]).includes(sp.tm)
      ? sp.tm
      : MONTHS[11];
  const toYear = Number(sp.ty ?? currentYear) || currentYear;

  // Normalise: ensure from <= to
  const swap = monthKey(fromMonth, fromYear) > monthKey(toMonth, toYear);
  const fM = swap ? toMonth : fromMonth;
  const fY = swap ? toYear : fromYear;
  const tM = swap ? fromMonth : toMonth;
  const tY = swap ? fromYear : toYear;

  // Filter entries by period
  const filtered = entries.filter((e) =>
    inRange(e.month, e.year ?? 2026, fM, fY, tM, tY),
  );

  // Group entries by person
  const byPerson = new Map<string, typeof filtered>();
  for (const e of filtered) {
    const arr = byPerson.get(e.person_id);
    if (arr) arr.push(e);
    else byPerson.set(e.person_id, [e]);
  }

  const peopleById = new Map(people.map((p) => [p.id, p.name]));
  const rangeLabel =
    fM === tM && fY === tY ? `${fM} ${fY}` : `${fM} ${fY} → ${tM} ${tY}`;

  return (
    <div>
      <h1 className="font-display text-4xl tracking-widest text-foreground mb-5">
        LEAD GENERATION · BONUSES
      </h1>

      <PeriodFilter
        availableYears={
          years.length > 0
            ? years
            : [currentYear - 1, currentYear, currentYear + 1]
        }
        defaultFromMonth={MONTHS[0]}
        defaultFromYear={minYear}
        defaultToMonth={MONTHS[11]}
        defaultToYear={currentYear}
      />

      <LeadgenSummary
        entries={filtered}
        peopleById={peopleById}
        rangeLabel={rangeLabel}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people
          .map((p) => ({ p, es: byPerson.get(p.id) ?? [] }))
          .filter(({ es }) => es.length > 0 || true) // show all, even if 0 in period
          .sort((a, b) => {
            const av = a.es.reduce((s, e) => s + (e.bonus || 0), 0);
            const bv = b.es.reduce((s, e) => s + (e.bonus || 0), 0);
            return bv - av;
          })
          .map(({ p, es }) => (
            <PersonCard key={p.id} person={p} entries={es} />
          ))}
      </div>

      {people.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground py-12 text-center">
          Участники не найдены
        </p>
      ) : null}
    </div>
  );
}
