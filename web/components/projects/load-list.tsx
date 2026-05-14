import Link from "next/link";
import type { Project } from "@/lib/schemas";

export const FULL_DAY_HOURS = 8;
const MONTH_DAYS = 20;
export const FULL_MONTH_HOURS = FULL_DAY_HOURS * MONTH_DAYS; // 160h/mo
/** < this fraction of a full day → person is considered bench (red). */
export const BENCH_THRESHOLD = 0.5; // 50% = 4 ч/день

export type LoadEntry = {
  name: string;
  monthHours: number;
  hoursPerDay: number;
  projects: Array<{
    project: Project;
    monthHours: number;
    hoursPerDay: number;
  }>;
};

export type LoadVariant = "bench" | "loaded";

export function LoadList({
  entries,
  variant,
}: {
  entries: LoadEntry[];
  variant: LoadVariant;
}) {
  if (entries.length === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground py-12 text-center">
        {variant === "bench"
          ? "На бенче никого нет — все штатные загружены на 8+ ч/день"
          : "Никто не загружен на 100% или больше"}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <LoadCard key={e.name} entry={e} variant={variant} />
      ))}
    </div>
  );
}

function LoadCard({
  entry,
  variant,
}: {
  entry: LoadEntry;
  variant: LoadVariant;
}) {
  const loadPct = (entry.hoursPerDay / FULL_DAY_HOURS) * 100;
  const deficit = Math.max(0, FULL_DAY_HOURS - entry.hoursPerDay);
  const isBench = variant === "bench";
  // Bench = <50% red; 50-99% yellow; 100%+ green.
  const colorCls =
    loadPct < BENCH_THRESHOLD * 100
      ? "text-bad"
      : loadPct < 100
        ? "text-warn"
        : "text-good";

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <Link
          href={`/projects/devs/${encodeURIComponent(entry.name)}`}
          className="font-display text-lg tracking-wide hover:text-primary transition truncate"
        >
          {entry.name}
        </Link>
        <div className="text-right">
          <div className={`font-mono text-sm ${colorCls}`}>
            {fmtHours(entry.hoursPerDay)} / {FULL_DAY_HOURS} ч/день ·{" "}
            {loadPct.toFixed(0)}%
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
            {isBench
              ? `свободно ${fmtHours(deficit)} ч/день`
              : loadPct >= 100
                ? "полная загрузка"
                : "средняя загрузка"}
          </div>
        </div>
      </div>

      <ul className="space-y-1 font-mono text-xs">
        {entry.projects.length === 0 ? (
          <li className="text-muted-foreground italic">
            Нет активных проектов
          </li>
        ) : (
          entry.projects.map((p) => (
            <li
              key={p.project.id}
              className="flex items-center justify-between gap-3"
            >
              <Link
                href={`/projects/${p.project.id}`}
                className="truncate text-foreground/90 hover:text-primary transition min-w-0 flex-1"
              >
                {p.project.name}
              </Link>
              <span className="text-muted-foreground shrink-0 whitespace-nowrap">
                {fmtHours(p.hoursPerDay)} ч/день
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function fmtHours(v: number) {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}
