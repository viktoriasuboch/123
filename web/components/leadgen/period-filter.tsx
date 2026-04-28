"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MONTHS } from "@/lib/months";

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

  function reset() {
    const next = new URLSearchParams(params);
    ["fm", "fy", "tm", "ty"].forEach((k) => next.delete(k));
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap gap-3 items-end mb-4">
      <PeriodSelect
        label="С"
        month={fromM}
        year={fromY}
        years={availableYears}
        onMonth={(m) => setMany({ fm: m })}
        onYear={(y) => setMany({ fy: String(y) })}
      />
      <span className="font-mono text-muted-foreground self-center mt-4">→</span>
      <PeriodSelect
        label="По"
        month={toM}
        year={toY}
        years={availableYears}
        onMonth={(m) => setMany({ tm: m })}
        onYear={(y) => setMany({ ty: String(y) })}
      />
      <button
        type="button"
        onClick={reset}
        disabled={pending}
        className="ml-auto h-9 px-3 rounded border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition"
      >
        ⟳ сброс
      </button>
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
