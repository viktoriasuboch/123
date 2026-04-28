"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MONTHS } from "@/lib/months";

type Preset = {
  id: string;
  label: string;
  resolve: (currentYear: number) => {
    fm: string;
    fy: number;
    tm: string;
    ty: number;
  } | null; // null = "all" / clear
};

const PRESETS: Preset[] = [
  { id: "all", label: "Всё", resolve: () => null },
  {
    id: "this-year",
    label: "Этот год",
    resolve: (y) => ({ fm: "Январь", fy: y, tm: "Декабрь", ty: y }),
  },
  {
    id: "last-year",
    label: "Прошлый год",
    resolve: (y) => ({ fm: "Январь", fy: y - 1, tm: "Декабрь", ty: y - 1 }),
  },
  {
    id: "q1",
    label: "Q1",
    resolve: (y) => ({ fm: "Январь", fy: y, tm: "Март", ty: y }),
  },
  {
    id: "q2",
    label: "Q2",
    resolve: (y) => ({ fm: "Апрель", fy: y, tm: "Июнь", ty: y }),
  },
  {
    id: "q3",
    label: "Q3",
    resolve: (y) => ({ fm: "Июль", fy: y, tm: "Сентябрь", ty: y }),
  },
  {
    id: "q4",
    label: "Q4",
    resolve: (y) => ({ fm: "Октябрь", fy: y, tm: "Декабрь", ty: y }),
  },
  {
    id: "last-3",
    label: "Последние 3 мес",
    resolve: (y) => {
      const now = new Date();
      const fromIdx = now.getMonth() - 2;
      const fromY = fromIdx < 0 ? y - 1 : y;
      const fromM = MONTHS[(fromIdx + 12) % 12];
      return { fm: fromM, fy: fromY, tm: MONTHS[now.getMonth()], ty: y };
    },
  },
  {
    id: "last-6",
    label: "Последние 6 мес",
    resolve: (y) => {
      const now = new Date();
      const fromIdx = now.getMonth() - 5;
      const fromY = fromIdx < 0 ? y - 1 : y;
      const fromM = MONTHS[(fromIdx + 12) % 12];
      return { fm: fromM, fy: fromY, tm: MONTHS[now.getMonth()], ty: y };
    },
  },
];

export function PeriodFilter({
  availableYears,
  defaultFromMonth,
  defaultFromYear,
  defaultToMonth,
  defaultToYear,
}: {
  availableYears: number[];
  defaultFromMonth: string;
  defaultFromYear: number;
  defaultToMonth: string;
  defaultToYear: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const fromM = params.get("fm") ?? defaultFromMonth;
  const fromY = Number(params.get("fy") ?? defaultFromYear);
  const toM = params.get("tm") ?? defaultToMonth;
  const toY = Number(params.get("ty") ?? defaultToYear);
  const currentYear = new Date().getFullYear();

  function setMany(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    start(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  function applyPreset(p: Preset) {
    const r = p.resolve(currentYear);
    if (r === null) {
      setMany({ fm: null, fy: null, tm: null, ty: null });
    } else {
      setMany({
        fm: r.fm,
        fy: String(r.fy),
        tm: r.tm,
        ty: String(r.ty),
      });
    }
  }

  // Detect which preset (if any) is active
  function presetActive(p: Preset): boolean {
    const r = p.resolve(currentYear);
    if (r === null) {
      return (
        !params.get("fm") &&
        !params.get("fy") &&
        !params.get("tm") &&
        !params.get("ty")
      );
    }
    return (
      fromM === r.fm &&
      fromY === r.fy &&
      toM === r.tm &&
      toY === r.ty
    );
  }

  return (
    <div className="space-y-3 mb-5">
      {/* Quick-switch presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = presetActive(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              disabled={pending}
              className={`h-8 px-3 rounded border font-mono text-[10px] uppercase tracking-[0.12em] transition ${
                active
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom from-to */}
      <div className="flex flex-wrap gap-3 items-end">
        <PeriodSelect
          label="С"
          month={fromM}
          year={fromY}
          years={availableYears}
          onMonth={(m) => setMany({ fm: m })}
          onYear={(y) => setMany({ fy: String(y) })}
        />
        <span className="font-mono text-muted-foreground self-end pb-2.5">→</span>
        <PeriodSelect
          label="По"
          month={toM}
          year={toY}
          years={availableYears}
          onMonth={(m) => setMany({ tm: m })}
          onYear={(y) => setMany({ ty: String(y) })}
        />
      </div>
    </div>
  );
}

function PeriodSelect({
  label,
  month,
  year,
  years,
  onMonth,
  onYear,
}: {
  label: string;
  month: string;
  year: number;
  years: number[];
  onMonth: (m: string) => void;
  onYear: (y: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-1.5">
        <select
          value={month}
          onChange={(e) => onMonth(e.target.value)}
          className="h-9 px-2 rounded border bg-background text-sm font-mono"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => onYear(Number(e.target.value))}
          className="h-9 px-2 rounded border bg-background text-sm font-mono"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
