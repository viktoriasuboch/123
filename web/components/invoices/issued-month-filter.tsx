"use client";

import { useRouter } from "next/navigation";

const RU_MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function labelFor(ym: string): string {
  const [y, m] = ym.split("-").map((s) => parseInt(s, 10));
  return `${RU_MONTHS[m - 1]} ${y}`;
}

/**
 * Dropdown that filters "Все инвойсы" by the invoice's issue_month
 * (YYYY-MM). "все" removes the filter. Navigates by writing to the
 * URL so the server component re-fetches with the new search params.
 */
export function IssuedMonthFilter({
  value,
  options,
  scope,
}: {
  value: string;
  options: string[];
  scope: "invoices" | "hays";
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        Выставлены в:
      </span>
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          const monthParam = v === "all" ? "" : `&issued_month=${v}`;
          router.push(`/invoices?tab=all&scope=${scope}${monthParam}`);
        }}
        className="h-8 px-2 rounded-md border border-input bg-transparent font-mono text-[11px] uppercase tracking-[0.12em] dark:bg-input/30"
      >
        <option value="all">все месяцы</option>
        {options.map((m) => (
          <option key={m} value={m}>
            {labelFor(m)}
          </option>
        ))}
      </select>
    </div>
  );
}
