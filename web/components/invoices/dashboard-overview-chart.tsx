/**
 * Grouped column chart, hand-rolled in HTML/CSS (no chart lib, so it
 * themes correctly in dark mode via Tailwind color classes). One group
 * per bucket ("Просрочено" + due-months); within a group one bar per
 * currency. Currencies never sum — each is its own bar.
 */

const CURRENCY_ORDER = ["USD", "EUR", "GBP", "RUB"];
const BAR: Record<string, { bar: string; text: string }> = {
  USD: { bar: "bg-sky-500", text: "text-sky-500" },
  EUR: { bar: "bg-good", text: "text-good" },
  GBP: { bar: "bg-amber-500", text: "text-amber-500" },
  RUB: { bar: "bg-muted-foreground", text: "text-muted-foreground" },
};

export type OverviewBucket = {
  label: string;
  overdue?: boolean;
  values: Record<string, number>;
};

export function DashboardOverviewChart({
  buckets,
}: {
  buckets: OverviewBucket[];
}) {
  const currencies = CURRENCY_ORDER.filter((c) =>
    buckets.some((b) => (b.values[c] ?? 0) > 0),
  );
  const max = Math.max(
    1,
    ...buckets.flatMap((b) => Object.values(b.values)),
  );
  const hasData = buckets.some((b) =>
    Object.values(b.values).some((v) => v > 0),
  );

  if (!hasData) {
    return (
      <div className="rounded-md border bg-card p-6 text-center font-mono text-xs text-muted-foreground">
        Нет данных для диаграммы за период.
      </div>
    );
  }

  const fmt = (v: number) =>
    v >= 1000
      ? `${Math.round(v / 100) / 10}k`
      : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-4 text-[11px] font-mono text-muted-foreground">
          {currencies.map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className={`inline-block size-2.5 rounded-sm ${BAR[c]?.bar ?? "bg-muted-foreground"}`} />
              {c}
            </span>
          ))}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          когда ждём деньги →
        </span>
      </div>

      <div className="flex items-end gap-2 h-[200px]">
        {buckets.map((b) => (
          <div
            key={b.label}
            className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0"
          >
            <div className="flex items-end justify-center gap-1 h-full w-full">
              {currencies.map((c) => {
                const v = b.values[c] ?? 0;
                if (v <= 0) return null;
                const h = Math.max(2, (v / max) * 100);
                return (
                  <div
                    key={c}
                    className="flex flex-col items-center justify-end h-full"
                    style={{ width: 22 }}
                    title={`${c} ${v.toLocaleString("en-US")}`}
                  >
                    <span className="font-mono text-[9px] text-muted-foreground mb-0.5">
                      {fmt(v)}
                    </span>
                    <div
                      className={`w-full rounded-t ${BAR[c]?.bar ?? "bg-muted-foreground"}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              className={`font-mono text-[10px] uppercase tracking-[0.1em] text-center truncate w-full ${
                b.overdue ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
