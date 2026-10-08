"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  COMPLETION_REASON_LABEL,
  type CompletionReasonValue,
  type Project,
} from "@/lib/schemas";

type Granularity = "month" | "quarter";
/** index = month 1–12 or quarter 1–4 */
type Period = { year: number; index: number };
type Key = CompletionReasonValue | "none";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function periodOf(iso: string, g: Granularity): Period {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return g === "month"
    ? { year, index: month }
    : { year, index: Math.floor((month - 1) / 3) + 1 };
}
function cmp(a: Period, b: Period): number {
  return a.year !== b.year ? a.year - b.year : a.index - b.index;
}
function shift(p: Period, g: Granularity, d: 1 | -1): Period {
  const max = g === "month" ? 12 : 4;
  let index = p.index + d;
  let year = p.year;
  if (index < 1) {
    index = max;
    year -= 1;
  } else if (index > max) {
    index = 1;
    year += 1;
  }
  return { year, index };
}
function label(p: Period, g: Granularity): string {
  return g === "month" ? `${MONTHS_RU[p.index - 1]} ${p.year}` : `Q${p.index} ${p.year}`;
}

/**
 * "Why did projects end" — reasons for the completed projects of one
 * month or quarter, chosen by completed_at. Projects without a date can't
 * be placed in a period and are counted separately; projects without a
 * reason get their own row so the backlog to fill in is visible.
 */
export function CompletionStats({ projects }: { projects: Project[] }) {
  const [g, setG] = useState<Granularity>("quarter");
  const [picked, setPicked] = useState<Period | null>(null);

  const dated = useMemo(
    () => projects.filter((p): p is Project & { completed_at: string } => !!p.completed_at),
    [projects],
  );
  const undated = projects.length - dated.length;

  const latest = useMemo(() => {
    let best = periodOf(new Date().toISOString().slice(0, 10), g);
    let found = false;
    for (const p of dated) {
      const pp = periodOf(p.completed_at, g);
      if (!found || cmp(pp, best) > 0) {
        best = pp;
        found = true;
      }
    }
    return best;
  }, [dated, g]);
  const current = picked ?? latest;

  const inPeriod = dated.filter((p) => cmp(periodOf(p.completed_at, g), current) === 0);
  const groups = new Map<Key, Project[]>();
  for (const p of inPeriod) {
    const k: Key = p.completion_reason ?? "none";
    const arr = groups.get(k);
    if (arr) arr.push(p);
    else groups.set(k, [p]);
  }
  const total = inPeriod.length;
  const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <section className="rounded-md border bg-card p-4">
      <header className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="font-display text-lg tracking-wide leading-none">
          🏁 Почему завершались проекты
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded border overflow-hidden">
            {(
              [
                { id: "month", text: "Месяц" },
                { id: "quarter", text: "Квартал" },
              ] as { id: Granularity; text: string }[]
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={g === o.id}
                onClick={() => {
                  setG(o.id);
                  setPicked(null);
                }}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                  g === o.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.text}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Предыдущий период"
              onClick={() => setPicked(shift(current, g, -1))}
              className="size-7 rounded border text-muted-foreground hover:text-foreground hover:border-primary/60 transition"
            >
              ‹
            </button>
            <span className="min-w-[128px] text-center font-mono text-xs uppercase tracking-[0.15em]">
              {label(current, g)}
            </span>
            <button
              type="button"
              aria-label="Следующий период"
              onClick={() => setPicked(shift(current, g, 1))}
              className="size-7 rounded border text-muted-foreground hover:text-foreground hover:border-primary/60 transition"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      {total === 0 ? (
        <p className="font-mono text-xs italic text-muted-foreground py-2">
          За этот период завершённых проектов нет.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map(([k, list]) => {
            const n = list.length;
            const pct = Math.round((n / total) * 100);
            const none = k === "none";
            return (
              <li key={k} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-sm ${none ? "text-warn" : ""}`}>
                    {none ? "Без причины — укажи на странице проекта" : COMPLETION_REASON_LABEL[k]}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {n} · {pct}%
                  </span>
                </div>
                <div className="h-2 rounded bg-muted/40 overflow-hidden">
                  <div
                    className={`h-full rounded ${none ? "bg-warn/60" : "bg-primary/70"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {none ? (
                  <p className="font-mono text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                    {list.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="hover:text-primary underline-offset-2 hover:underline"
                      >
                        {p.name}
                      </Link>
                    ))}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-4 flex items-center justify-between gap-3 flex-wrap font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Всего за период: {total}</span>
        {undated > 0 ? (
          <span className="text-warn">
            {undated} завершённых без даты — не попадают в периоды
          </span>
        ) : null}
      </footer>
    </section>
  );
}
