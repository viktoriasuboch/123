"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/leadgen", label: "По людям" },
  { href: "/leadgen/months", label: "По месяцам" },
  { href: "/leadgen/summary", label: "Сводка" },
  { href: "/leadgen/deals?type=sql", label: "📋 SQL", match: "/leadgen/deals" },
  { href: "/leadgen/deals?type=closed", label: "🏆 Закрытые", match: "/leadgen/deals" },
  { href: "/leadgen/salaries", label: "💰 Зарплаты" },
  { href: "/leadgen/revenue", label: "📊 Revenue" },
] as const;

export function LeadgenTabs() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const dealType = sp.get("type") ?? "sql";

  return (
    <nav className="flex flex-wrap gap-1.5 mb-5 border-b pb-3">
      {TABS.map((t) => {
        const matchPath = "match" in t ? t.match : t.href;
        let active = false;
        if (matchPath === "/leadgen") {
          active = pathname === "/leadgen";
        } else if (matchPath === "/leadgen/deals") {
          // Two deals tabs (SQL/Closed) — disambiguate by the type query param
          active =
            pathname.startsWith("/leadgen/deals") &&
            t.href.includes(`type=${dealType}`);
        } else {
          active = pathname.startsWith(matchPath);
        }
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.15em] transition border ${
              active
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
