import { bucketToUsd } from "@/lib/fx";

/**
 * "Когда ждём деньги" — horizontal bars, hand-rolled in HTML/CSS (no
 * chart lib, so it themes correctly via Tailwind tokens). One block per
 * bucket ("Просрочено" + due-months); inside a block one full-width bar
 * per currency with the amount in its own readable column. Currencies
 * never sum — each is its own bar; the ≈$ per block is a reference total
 * across currencies.
 */

const CURRENCY_ORDER = ["USD", "EUR", "GBP", "RUB"];
const BAR: Record<string, string> = {
  USD: "bg-sky-500",
  EUR: "bg-good",
  GBP: "bg-amber-500",
  RUB: "bg-muted-foreground",
};

export type OverviewBucket = {
  label: string;
  overdue?: boolean;
  values: Record<string, number>;
};

const fmtFull = (v: number) =>
  v.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function DashboardOverviewChart({
  buckets,
  rates,
}: {
  buckets: OverviewBucket[];
  rates: Record<string, number>;
}) {
  const currencies = CURRENCY_ORDER.filter((c) =>
    buckets.some((b) => (b.values[c] ?? 0) > 0),
  );
  const max = Math.max(1, ...buckets.flatMap((b) => Object.values(b.values)));
  const hasData = buckets.some((b) =>
    Object.values(b.values).some((v) => v > 0),
  );

  return (
    <div className="rounded-md border bg-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <h3 className="font-display text-lg tracking-wide leading-none">
          Когда ждём деньги
        </h3>
        <div className="flex gap-3.5 text-[11px] font-mono text-muted-foreground">
          {currencies.map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className={`inline-block size-2.5 rounded-sm ${BAR[c] ?? "bg-muted-foreground"}`} />
              {c}
            </span>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="py-8 text-center font-mono text-xs text-muted-foreground">
          Нет ожидаемых поступлений за период.
        </p>
      ) : (
        <div className="space-y-5">
          {buckets.map((b) => {
            const rows = CURRENCY_ORDER.filter((c) => (b.values[c] ?? 0) > 0)
              .map((c) => [c, b.values[c]] as const)
              .sort((x, y) => y[1] - x[1]);
            const usd = bucketToUsd(b.values, rates);
            return (
              <div key={b.label} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`text-sm font-medium tracking-wide ${
                      b.overdue ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {b.label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    ≈ ${fmtFull(usd)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {rows.map(([c, v]) => (
                    <div key={c} className="flex items-center gap-3">
                      <span className="w-9 shrink-0 font-mono text-[11px] text-muted-foreground">
                        {c}
                      </span>
                      <div className="flex-1 h-7 rounded bg-muted/50 overflow-hidden">
                        <div
                          className={`h-full rounded ${BAR[c] ?? "bg-muted-foreground"}`}
                          style={{ width: `${Math.max(3, (v / max) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right font-mono text-sm tabular-nums">
                        {fmtFull(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
