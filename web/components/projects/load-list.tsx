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
