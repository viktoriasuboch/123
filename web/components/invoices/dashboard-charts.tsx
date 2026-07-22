/**
 * Hand-rolled SVG mini-charts for the invoices dashboard (ADR: no
 * charting dependency — three simple shapes render fine as inline SVG
 * and stay server-rendered). All three operate on a single currency
 * (the dominant one) so nothing is summed across currencies.
 */

const RU_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

const DONUT_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
];

function shortMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card flex flex-col">
      <header className="p-4 border-b">
        <h3 className="font-display text-lg tracking-wide leading-none">
          {title}
        </h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
          {subtitle}
        </p>
      </header>
      <div className="p-4 flex-1 flex items-center justify-center">
        {children}
      </div>
    </section>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <p className="py-6 text-center font-mono text-xs text-muted-foreground">
      {text}
    </p>
  );
}

/* ─── cash by month (bar) ─────────────────────────────────────────── */

export function CashByMonthBar({
  data,
  currency,
}: {
  data: { ym: string; total: number }[];
  currency: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const hasCash = data.some((d) => d.total > 0);
  const W = 320;
  const H = 140;
  const padB = 22;
  const padT = 8;
  const gap = 10;
  const barW = (W - gap * (data.length - 1)) / data.length;
  const chartH = H - padB - padT;

  return (
    <ChartCard
      title="Поступления"
      subtitle={`Оплачено · ${currency} · 6 мес.`}
    >
      {hasCash ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Поступления по месяцам"
        >
          {data.map((d, i) => {
            const h = (d.total / max) * chartH;
            const x = i * (barW + gap);
            const y = padT + (chartH - h);
            const [, mm] = d.ym.split("-");
            return (
              <g key={d.ym}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, d.total > 0 ? 2 : 0)}
                  rx={2}
                  fill="var(--color-primary)"
                  opacity={0.85}
                />
                {d.total > 0 ? (
                  <text
                    x={x + barW / 2}
                    y={y - 3}
                    textAnchor="middle"
                    fontSize="8"
                    fill="var(--color-muted-foreground)"
                    fontFamily="var(--font-mono, monospace)"
                  >
                    {shortMoney(d.total)}
                  </text>
                ) : null}
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--color-muted-foreground)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {RU_SHORT[parseInt(mm, 10) - 1]}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <EmptyChart text="Оплат за 6 месяцев нет." />
      )}
    </ChartCard>
  );
}

/* ─── top clients (donut) ─────────────────────────────────────────── */

export function TopClientsDonut({
  data,
  currency,
}: {
  data: { name: string; total: number }[];
  currency: string;
}) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const R = 52;
  const r = 32;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * ((R + r) / 2);
  const strokeW = R - r;

  const fracs = data.map((d) => (total > 0 ? d.total / total : 0));
  const segs = data.map((d, i) => ({
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    dash: fracs[i] * circ,
    offset: fracs.slice(0, i).reduce((a, b) => a + b, 0) * circ,
    name: d.name,
    total: d.total,
    pct: Math.round(fracs[i] * 100),
  }));

  return (
    <ChartCard title="Клиенты" subtitle={`Выставлено за период · ${currency}`}>
      {total > 0 ? (
        <div className="flex items-center gap-4 w-full">
          <svg
            viewBox="0 0 120 120"
            className="w-28 h-28 shrink-0 -rotate-90"
            role="img"
            aria-label="Топ клиентов по объёму"
          >
            <circle
              cx={cx}
              cy={cy}
              r={(R + r) / 2}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={strokeW}
              opacity={0.3}
            />
            {segs.map((s) => (
              <circle
                key={s.name}
                cx={cx}
                cy={cy}
                r={(R + r) / 2}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeW}
                strokeDasharray={`${s.dash} ${circ - s.dash}`}
                strokeDashoffset={-s.offset}
              />
            ))}
          </svg>
          <ul className="flex-1 min-w-0 space-y-1">
            {segs.map((s) => (
              <li
                key={s.name}
                className="flex items-center gap-2 text-xs min-w-0"
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: s.color }}
                />
                <span className="truncate flex-1">{s.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {s.pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyChart text="За период ничего не выставлено." />
      )}
    </ChartCard>
  );
}

/* ─── payment latency (bars + avg) ────────────────────────────────── */

export function PaymentLatencyBars({
  avgDays,
  count,
  buckets,
  currency,
}: {
  avgDays: number;
  count: number;
  buckets: { label: string; count: number }[];
  currency: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <ChartCard
      title="Скорость оплаты"
      subtitle={`Дней от инвойса до оплаты · ${currency}`}
    >
      {count > 0 ? (
        <div className="w-full space-y-3">
          <div className="text-center">
            <span className="font-display text-3xl text-primary leading-none">
              {avgDays}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground ml-2">
              дн. в среднем · {count} опл.
            </span>
          </div>
          <ul className="space-y-1.5">
            {buckets.map((b) => (
              <li key={b.label} className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground w-10 shrink-0 text-right">
                  {b.label}
                </span>
                <div className="flex-1 h-3 rounded-sm bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-primary/80"
                    style={{ width: `${(b.count / max) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground w-5 shrink-0">
                  {b.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyChart text="За период оплат нет." />
      )}
    </ChartCard>
  );
}
