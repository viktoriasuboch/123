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
  const view = (params.get("view") ?? "list") as "list" | "grid";

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

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {/* view-mode toggle */}
        <div className="inline-flex rounded border border-border overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setParam("view", "list")}
            className={`h-9 px-2.5 inline-flex items-center justify-center transition ${
              view === "list"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            disabled={pending}
            title="Список"
            aria-label="Список"
          >
            <ListIcon />
          </button>
          <button
            type="button"
            onClick={() => setParam("view", "grid")}
            className={`h-9 px-2.5 inline-flex items-center justify-center transition border-l border-border ${
              view === "grid"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            disabled={pending}
            title="Плитка"
            aria-label="Плитка"
          >
            <GridIcon />
          </button>
        </div>

        <input
          type="search"
          defaultValue={q}
          placeholder="Поиск…"
          onChange={(e) => setParam("q", e.target.value)}
          className="h-9 px-3 rounded border bg-background text-sm font-mono w-full sm:w-72 placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}
