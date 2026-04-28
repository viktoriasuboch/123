"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/leadgen", label: "Бонусы" },
  { href: "/leadgen/months", label: "Месяцы" },
  { href: "/leadgen/summary", label: "Сводка" },
  { href: "/leadgen/deals", label: "Сделки" },
  { href: "/leadgen/salaries", label: "Зарплаты" },
  { href: "/leadgen/revenue", label: "Ревеню" },
] as const;

export function LeadgenTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5 mb-5 border-b pb-3">
      {TABS.map((t) => {
        const active =
          t.href === "/leadgen"
            ? pathname === "/leadgen"
            : pathname.startsWith(t.href);
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
