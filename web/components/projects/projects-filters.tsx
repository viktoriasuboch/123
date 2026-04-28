"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const TABS = [
  { id: "active",   label: "Активные" },
  { id: "inactive", label: "Завершённые" },
  { id: "devs",     label: "👤 Разработчики" },
] as const;

const DEV_FILTERS = [
  { id: "all",        label: "Все" },
  { id: "staff",      label: "Штатные" },
  { id: "freelancer", label: "Фрилансеры" },
  { id: "fired",      label: "Уволенные" },
] as const;

export type DevFilterId = (typeof DEV_FILTERS)[number]["id"];

export function ProjectsFilters({
  activeCount,
  inactiveCount,
  devsCount,
  devsByFilter,
}: {
  activeCount: number;
  inactiveCount: number;
  devsCount: number;
  devsByFilter: Record<DevFilterId, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const tab = (params.get("tab") ?? "active") as (typeof TABS)[number]["id"];
  const devFilter = (params.get("dev") ?? "all") as DevFilterId;
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
    <div className="flex flex-col gap-3 mb-5">
      {/* Row 1: main tabs + view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
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

        <div className="ml-auto inline-flex rounded border border-border overflow-hidden shrink-0">
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
      </div>

      {/* Row 2: dev sub-filter (only on devs tab) */}
      {tab === "devs" ? (
        <div className="flex flex-wrap gap-1.5">
          {DEV_FILTERS.map((f) => {
            const sel = devFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() =>
                  setParam("dev", f.id === "all" ? null : f.id)
                }
                disabled={pending}
                className={`h-8 px-3 rounded border font-mono text-[10px] uppercase tracking-[0.12em] transition ${
                  sel
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-[9px] opacity-70">
                  {devsByFilter[f.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Row 3: search */}
      <input
        type="search"
        defaultValue={q}
        placeholder="Поиск…"
        onChange={(e) => setParam("q", e.target.value)}
        className="h-9 px-3 rounded border bg-background text-sm font-mono w-full placeholder:text-muted-foreground/60"
      />
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
