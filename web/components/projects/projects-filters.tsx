"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const TABS = [
  { id: "active",   label: "Активные" },
  { id: "inactive", label: "Завершённые" },
  { id: "devs",     label: "👤 Разработчики" },
] as const;

export function ProjectsFilters({
  activeCount,
  inactiveCount,
  devsCount,
}: {
  activeCount: number;
  inactiveCount: number;
  devsCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const tab = (params.get("tab") ?? "active") as (typeof TABS)[number]["id"];
  const q = params.get("q") ?? "";

  function setParam(key: string, val: string | null) {
    const next = new URLSearchParams(params);
    if (val == null || val === "") next.delete(key);
    else next.set(key, val);
    start(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  const counts: Record<string, number> = {
    active: activeCount,
    inactive: inactiveCount,
    devs: devsCount,
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const sel = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setParam("tab", t.id)}
              className={`px-3 py-1.5 rounded border font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                sel
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
              disabled={pending}
            >
              {t.label}
              <span className="ml-1.5 text-[9px] opacity-70">{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      <input
        type="search"
        defaultValue={q}
        placeholder="Поиск…"
        onChange={(e) => setParam("q", e.target.value)}
        className="h-9 px-3 rounded border bg-background text-sm font-mono w-full sm:w-72 placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
