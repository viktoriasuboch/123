"use client";

import { useRouter } from "next/navigation";

const RU_MONTHS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

/**
 * Month pills (label only, no year) + a compact year switcher on the
 * side. Filters "Все инвойсы" by issue year/month. `month` is "all" or
 * a zero-padded MM; `year` is a number. Navigates via the URL so the
 * server component re-computes list + stats.
 */
export function MonthYearFilter({
  scope,
  year,
  month,
  years,
  months,
}: {
  scope: "invoices" | "hays";
  year: number;
  month: string; // "all" | "01".."12"
  years: number[];
  months: string[]; // MM present in the selected year, ascending
}) {
  const router = useRouter();
  const go = (y: number, m: string) =>
    router.push(`/invoices?tab=all&scope=${scope}&year=${y}&month=${m}`);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Pill active={month === "all"} onClick={() => go(year, "all")}>
          Все
        </Pill>
        {months.map((mm) => (
          <Pill
            key={mm}
            active={month === mm}
            onClick={() => go(year, mm)}
          >
            {RU_MONTHS[parseInt(mm, 10) - 1]}
          </Pill>
        ))}
      </div>

      {years.length > 1 ? (
        <div className="flex items-center gap-1 pl-3 border-l border-border">
          {years.map((y) => (
            <Pill
              key={y}
              active={y === year}
              onClick={() => go(y, "all")}
              subtle
            >
              {y}
            </Pill>
          ))}
        </div>
      ) : (
        <span className="pl-3 border-l border-border font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {year}
        </span>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  subtle,
  children,
}: {
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md border font-mono text-[10px] uppercase tracking-[0.15em] transition ${
        active
          ? subtle
            ? "border-foreground/40 bg-foreground/10 text-foreground"
            : "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
