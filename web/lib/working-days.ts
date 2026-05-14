/**
 * Russian production-calendar helpers.
 *
 * `RU_HOLIDAYS` holds non-working dates (statutory holidays + any
 * government-decreed extra days off) as "YYYY-MM-DD" strings. Update
 * the set whenever the official calendar for a new year is published.
 *
 * Standard weekly days off (Sat / Sun) are not listed — they are
 * always treated as non-working by `workingDaysInMonth`.
 */

// 2026 production calendar (RU) — статутные нерабочие дни + перенесённые.
// Источник: производственный календарь РФ 2026. Update when needed.
export const RU_HOLIDAYS_2026 = new Set<string>([
  "2026-01-01", // Новогодние каникулы
  "2026-01-02",
  "2026-01-05",
  "2026-01-06",
  "2026-01-07", // Рождество
  "2026-01-08",
  "2026-02-23", // День защитника Отечества (Mon)
  "2026-03-09", // Перенос с воскресенья 8 марта
  "2026-05-01", // Праздник Весны и Труда (Fri)
  "2026-05-11", // Перенос с субботы 9 мая
  "2026-06-12", // День России (Fri)
  "2026-11-04", // День народного единства (Wed)
  "2026-12-31", // Перенос
]);

// 2027 — defaults: just the statutory holidays. Refine when official
// calendar is published.
export const RU_HOLIDAYS_2027 = new Set<string>([
  "2027-01-01",
  "2027-01-04",
  "2027-01-05",
  "2027-01-06",
  "2027-01-07",
  "2027-01-08",
  "2027-02-23",
  "2027-03-08",
  "2027-05-03", // перенос с 1 мая (сб) — приблизительно
  "2027-05-10", // перенос с 9 мая (вс) — приблизительно
  "2027-06-14", // перенос с 12 июня (сб) — приблизительно
  "2027-11-04",
]);

export function holidaysForYear(year: number): Set<string> {
  if (year === 2026) return RU_HOLIDAYS_2026;
  if (year === 2027) return RU_HOLIDAYS_2027;
  return new Set();
}

/** ISO "YYYY-MM-DD" of a local-time date. */
function isoDay(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Working days in a given month (year, month is 0-indexed JS Date
 * convention, i.e. 4 = May). Counts Mon–Fri minus listed holidays.
 */
export function workingDaysInMonth(year: number, month: number): number {
  const holidays = holidaysForYear(year);
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const wd = new Date(year, month, d).getDay(); // 0 Sun … 6 Sat
    if (wd === 0 || wd === 6) continue;
    if (holidays.has(isoDay(year, month, d))) continue;
    count++;
  }
  return count;
}

/** Working hours in a month, assuming an 8-hour workday. */
export function workingHoursInMonth(year: number, month: number): number {
  return workingDaysInMonth(year, month) * 8;
}

/** Baseline against which `project_members.hours_load` is sized. */
export const BASELINE_MONTH_HOURS = 160;

/**
 * Return an array of N future months starting at `from`. Each entry has
 * year / month (0-indexed) + the working-day / working-hour count.
 */
export function nextMonths(
  from: { year: number; month: number },
  count: number,
): Array<{
  year: number;
  month: number;
  workingDays: number;
  workingHours: number;
}> {
  const out: Array<{
    year: number;
    month: number;
    workingDays: number;
    workingHours: number;
  }> = [];
  let y = from.year;
  let m = from.month;
  for (let i = 0; i < count; i++) {
    const wd = workingDaysInMonth(y, m);
    out.push({ year: y, month: m, workingDays: wd, workingHours: wd * 8 });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}

import { MONTHS } from "@/lib/months";

/** "Май" for month=4. Falls back to "?" if out of range. */
export function ruMonthName(month: number) {
  return MONTHS[month] ?? "?";
}

/** "Май '26" — short tag for headers. */
export function ruMonthShort(month: number, year: number) {
  const name = MONTHS[month] ?? "?";
  return `${name.slice(0, 3)} '${String(year).slice(2)}`;
}
