import { listEntries } from "@/lib/data/leadgen";
import { activeMonths, monthColor } from "@/lib/months";
import { catMeta, CAT_KEYS } from "./categories";

export async function LeadgenHeader() {
  const entries = await listEntries();
  const positive = entries.filter((e) => (e.bonus || 0) > 0);
  const periods = activeMonths(
    positive.map((e) => ({ month: e.month, year: e.year ?? 2026 })),
  );

  const years = Array.from(new Set(periods.map((p) => p.year))).sort();
  const yearStr =
    years.length === 0
      ? new Date().getFullYear().toString()
      : years.length === 1
        ? `${years[0]}`
        : `${years[0]}–${years[years.length - 1]}`;

  const periodCount = periods.length;
  const first = periods[0];
  const last = periods[periods.length - 1];
  const periodStr =
    periods.length === 0
      ? null
      : periods.length === 1
        ? `${first.month} ${first.year}`
        : `${first.month} ${first.year} — ${last.month} ${last.year}`;

  return (
    <header className="mb-5 pb-4 border-b border-border">
      <h1 className="font-display text-3xl sm:text-5xl tracking-widest text-primary leading-none">
        SALES BONUS REPORT {yearStr}
      </h1>
      {periodStr ? (
        <p className="mt-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Leadgen Team · {periodStr} · {periodCount}{" "}
          {periodCount === 1 ? "месяц" : periodCount < 5 ? "месяца" : "месяцев"} · USD
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 items-center">
        {CAT_KEYS.map((k) => {
          const meta = catMeta(k);
          return (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              <span
                className={`size-2 rounded-full ${meta.bg.replace("/30", "")}`}
                aria-hidden
              />
              {meta.label}
            </span>
          );
        })}
        {periods.length > 0 ? (
          <span className="h-3 w-px bg-border mx-1.5" aria-hidden />
        ) : null}
        {periods.map(({ month, year }) => (
          <span
            key={`${year}-${month}`}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: monthColor(month) }}
              aria-hidden
            />
            {month.slice(0, 3)}
          </span>
        ))}
      </div>
    </header>
  );
}
