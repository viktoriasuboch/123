/* Russian month names as stored in DB. */
export const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

export type MonthName = (typeof MONTHS)[number];

const IDX = new Map<string, number>(MONTHS.map((m, i) => [m, i]));

/** 0-11 index for sorting; unknown month → 0 */
export function monthIdx(m: string): number {
  return IDX.get(m) ?? 0;
}

/** chronological sort key */
export function monthKey(m: string, y: number | null | undefined): number {
  return (y ?? 2026) * 12 + monthIdx(m);
}

/** "Мар '26" */
export function shortMonth(m: string, y: number | null | undefined): string {
  return `${m.slice(0, 3)} '${String(y ?? 2026).slice(2)}`;
}

/** Inclusive between (m1,y1) … (m2,y2). */
export function inRange(
  m: string,
  y: number | null | undefined,
  fromMonth: string,
  fromYear: number,
  toMonth: string,
  toYear: number,
): boolean {
  const k = monthKey(m, y);
  return k >= monthKey(fromMonth, fromYear) && k <= monthKey(toMonth, toYear);
}

/** From an array of items with .month/.year, return the unique chronological pairs. */
export function activeMonths(
  items: Array<{ month: string; year: number | null }>,
): Array<{ month: string; year: number }> {
  const seen = new Set<string>();
  const pairs: Array<{ month: string; year: number }> = [];
  for (const e of items) {
    const y = e.year ?? 2026;
    const k = `${y}-${e.month}`;
    if (seen.has(k)) continue;
    seen.add(k);
    pairs.push({ month: e.month, year: y });
  }
  pairs.sort((a, b) => monthKey(a.month, a.year) - monthKey(b.month, b.year));
  return pairs;
}
