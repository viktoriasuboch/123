"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  COMPLETION_REASON_LABEL,
  type CompletionReasonValue,
  type Project,
} from "@/lib/schemas";
import { fmtDate, fmtMoney } from "@/lib/calc";

/** Period keys: "y:2026" (whole year), "q:2026-3", "m:2026-07". */
type PeriodKey = string;

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function ym(iso: string): { y: number; m: number } {
  return { y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) };
}
function quarterOf(m: number): number {
  return Math.floor((m - 1) / 3) + 1;
}
function inPeriod(iso: string, key: PeriodKey): boolean {
  const { y, m } = ym(iso);
  const [kind, rest] = key.split(":");
  if (kind === "y") return y === Number(rest);
  const [yy, part] = rest.split("-").map(Number);
  if (kind === "q") return y === yy && quarterOf(m) === part;
  if (kind === "m") return y === yy && m === part;
  return false;
}

type Dated = Project & { completed_at: string };

/**
 * Completed projects for a chosen period — the whole year by default, or
 * one quarter / month from the dropdown — with the reason each one ended
 * and the monthly revenue we were getting from it. Projects without a
 * completion date can't be placed in a period and are counted apart.
 */
export function CompletionStats({
  projects,
  revByProject,
  showTotals,
}: {
  projects: Project[];
  revByProject: Record<string, number>;
  showTotals: boolean;
}) {
  const dated = useMemo(
    () => projects.filter((p): p is Dated => !!p.completed_at),
    [projects],
  );
  const undated = projects.length - dated.length;
  const currentYear = new Date().getFullYear();

  // Dropdown: every year that has data (plus the current one), each with
  // its whole-year entry, then only the quarters / months that have data.
  const groups = useMemo(() => {
    const years = new Set<number>([currentYear]);
    const quarters = new Set<string>();
    const months = new Set<string>();
    for (const p of dated) {
      const { y, m } = ym(p.completed_at);
      years.add(y);
      quarters.add(`${y}-${quarterOf(m)}`);
      months.add(`${y}-${m}`);
    }
    return [...years]
      .sort((a, b) => b - a)
      .map((y) => ({
        year: y,
        options: [
          { key: `y:${y}`, text: `Весь ${y}` },
          ...[1, 2, 3, 4]
            .filter((q) => quarters.has(`${y}-${q}`))
            .map((q) => ({ key: `q:${y}-${q}`, text: `Q${q} ${y}` })),
          ...Array.from({ length: 12 }, (_, i) => i + 1)
            .filter((m) => months.has(`${y}-${m}`))
            .map((m) => ({ key: `m:${y}-${m}`, text: `${MONTHS_RU[m - 1]} ${y}` })),
        ],
      }));
  }, [dated, currentYear]);

  const [period, setPeriod] = useState<PeriodKey>(`y:${currentYear}`);

  const rows = dated
    .filter((p) => inPeriod(p.completed_at, period))
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  const totalRev = rows.reduce((s, p) => s + (revByProject[p.id] ?? 0), 0);
  const missingReason = rows.filter((p) => !p.completion_reason).length;

  const byReason = new Map<CompletionReasonValue, number>();
  for (const p of rows) {
    if (!p.completion_reason) continue;
    byReason.set(p.completion_reason, (byReason.get(p.completion_reason) ?? 0) + 1);
  }
  const reasonSummary = [...byReason.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <section className="rounded-md border bg-card">
      <header className="flex items-center justify-between gap-3 flex-wrap p-4 border-b">
        <div>
          <h2 className="font-display text-lg tracking-wide leading-none">
            🏁 Завершённые проекты
          </h2>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            почему закончились · что мы получали в месяц
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Период"
          className="h-9 rounded border bg-background px-3 font-mono text-xs uppercase tracking-[0.12em]"
        >
          {groups.map((g) => (
            <optgroup key={g.year} label={String(g.year)}>
              {g.options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.text}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </header>

      {rows.length === 0 ? (
        <p className="p-4 font-mono text-xs italic text-muted-foreground">
          За этот период завершённых проектов нет.
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <th className="text-left p-3 font-normal">Проект</th>
              <th className="text-left p-3 font-normal">Причина</th>
              <th className="text-left p-3 font-normal whitespace-nowrap">Завершён</th>
              <th className="text-right p-3 font-normal whitespace-nowrap">Получали / мес</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const rev = revByProject[p.id] ?? 0;
              return (
                <tr
                  key={p.id}
                  className="border-b border-border/40 hover:bg-muted/20 transition"
                >
                  <td className="p-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-display text-lg leading-tight hover:text-primary transition"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="p-3">
                    {p.completion_reason ? (
                      <span className="inline-block rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {COMPLETION_REASON_LABEL[p.completion_reason]}
                      </span>
                    ) : (
                      <Link
                        href={`/projects/${p.id}`}
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-warn hover:underline underline-offset-2"
                      >
                        причина не указана →
                      </Link>
                    )}
                    {p.completion_note ? (
                      <p className="mt-1 text-xs italic text-muted-foreground line-clamp-2">
                        {p.completion_note}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(p.completed_at)}
                  </td>
                  <td className="p-3 text-right font-mono text-base whitespace-nowrap">
                    {rev > 0 ? (
                      fmtMoney(rev)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td className="p-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground" colSpan={3}>
                {rows.length} {plural(rows.length, "проект", "проекта", "проектов")}
                {reasonSummary.length > 0 ? (
                  <span className="normal-case tracking-normal">
                    {" · "}
                    {reasonSummary
                      .map(([r, n]) => `${COMPLETION_REASON_LABEL[r]} — ${n}`)
                      .join(" · ")}
                  </span>
                ) : null}
                {missingReason > 0 ? (
                  <span className="text-warn">{` · без причины — ${missingReason}`}</span>
                ) : null}
              </td>
              <td className="p-3 text-right font-mono whitespace-nowrap">
                {showTotals ? (
                  <>
                    <span className="block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      итого в месяц
                    </span>
                    <span className="font-display text-xl text-bad">
                      {fmtMoney(totalRev)}
                    </span>
                  </>
                ) : null}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {undated > 0 ? (
        <p className="px-4 py-2.5 border-t font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Ещё {undated} {plural(undated, "завершённый", "завершённых", "завершённых")} без даты — в периоды не попадают, дату можно указать на странице проекта
        </p>
      ) : null}
    </section>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
