import Link from "next/link";
import type { Project } from "@/lib/schemas";

export const BENCH_FULL_DAY = 8;
const MONTH_DAYS = 20;
export const BENCH_FULL_MONTH = BENCH_FULL_DAY * MONTH_DAYS; // 160h/month

export type BenchEntry = {
  name: string;
  monthHours: number;
  hoursPerDay: number;
  projects: Array<{
    project: Project;
    monthHours: number;
    hoursPerDay: number;
  }>;
};

export function BenchList({ entries }: { entries: BenchEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground py-12 text-center">
        На бенче никого нет — все штатные загружены на 8+ ч/день
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <BenchCard key={e.name} entry={e} />
      ))}
    </div>
  );
}

function BenchCard({ entry }: { entry: BenchEntry }) {
  const loadPct = (entry.hoursPerDay / BENCH_FULL_DAY) * 100;
  const deficit = BENCH_FULL_DAY - entry.hoursPerDay;
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
          <div className="font-mono text-sm text-bad">
            {fmtHours(entry.hoursPerDay)} / {BENCH_FULL_DAY} ч/день
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
            загрузка {loadPct.toFixed(0)}% · свободно {fmtHours(deficit)} ч/день
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
  // 8.0 → "8", 2.5 → "2.5"
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}
