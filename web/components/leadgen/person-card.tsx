import type { Person, Entry } from "@/lib/schemas";
import { catMeta, CAT_KEYS } from "./categories";
import { activeMonths, shortMonth } from "@/lib/months";

export function PersonCard({
  person,
  entries,
}: {
  person: Person;
  entries: Entry[];
}) {
  const total = entries.reduce((s, e) => s + (e.bonus || 0), 0);
  const byCat: Record<string, number> = {};
  for (const k of CAT_KEYS) byCat[k] = 0;
  for (const e of entries) byCat[e.cat] = (byCat[e.cat] || 0) + (e.bonus || 0);

  const months = activeMonths(
    entries.filter((e) => (e.bonus || 0) > 0).map((e) => ({ month: e.month, year: e.year ?? 2026 })),
  );
  const positiveEntries = entries.filter((e) => (e.bonus || 0) > 0);

  return (
    <article className="rounded-md border bg-card overflow-hidden">
      <header className="px-4 py-3 border-b flex items-center justify-between gap-2">
        <h3 className="font-display text-xl tracking-wide leading-none">
          {person.name}
        </h3>
        <span className="font-display text-2xl text-primary leading-none">
          ${total.toLocaleString("en-US")}
        </span>
      </header>

      {/* month pills */}
      {months.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b">
          {months.map(({ month, year }) => {
            const v = entries
              .filter((e) => e.month === month && (e.year ?? 2026) === year)
              .reduce((s, e) => s + (e.bonus || 0), 0);
            if (v <= 0) return null;
            return (
              <span
                key={`${month}-${year}`}
                className="font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {shortMonth(month, year)} ${v}
              </span>
            );
          })}
        </div>
      ) : null}

      {/* category bars */}
      <div className="px-4 py-2.5 border-b space-y-1">
        {CAT_KEYS.filter((k) => byCat[k] > 0).map((k) => {
          const meta = catMeta(k);
          return (
            <div key={k} className="flex items-center gap-2 text-[11px] font-mono">
              <span className="w-[72px] text-muted-foreground uppercase tracking-[0.05em]">
                {meta.label}
              </span>
              <div className="flex-1 h-1 rounded bg-muted overflow-hidden">
                <div
                  className={meta.bg}
                  style={{
                    width: total === 0 ? "0%" : `${(byCat[k] / total) * 100}%`,
                    height: "100%",
                  }}
                />
              </div>
              <span className={`w-10 text-right ${meta.text}`}>
                ${byCat[k]}
              </span>
            </div>
          );
        })}
        {Object.values(byCat).every((v) => v === 0) ? (
          <div className="text-xs text-muted-foreground italic">
            Нет начислений в выбранном периоде
          </div>
        ) : null}
      </div>

      {/* entries list */}
      {positiveEntries.length > 0 ? (
        <ul className="divide-y divide-border max-h-72 overflow-y-auto">
          {positiveEntries.map((e) => {
            const meta = catMeta(e.cat);
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 px-4 py-2 text-sm"
              >
                <span
                  className={`size-2 rounded-full ${meta.bg.replace("/30", "")}`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <div className="text-foreground truncate">{e.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {e.month} {e.year ?? ""}
                    {e.comment ? ` · ${e.comment}` : ""}
                  </div>
                </div>
                <span className={`font-display ${meta.text}`}>${e.bonus}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}
