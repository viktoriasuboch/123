"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardPeriodKind } from "@/lib/calc";

const PRESETS: { id: Exclude<DashboardPeriodKind, "custom">; label: string }[] = [
  { id: "this", label: "Этот месяц" },
  { id: "prev", label: "Прошлый" },
  { id: "prev2", label: "Позапрошлый" },
];

/**
 * Period selector for the dashboard. Presets and custom range both
 * write to the URL so the RSC re-computes every widget — no client
 * state drives the numbers (Next 16.2: filter via URL, not useState).
 */
export function DashboardPeriodFilter({
  kind,
  from,
  to,
}: {
  kind: DashboardPeriodKind;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(kind === "custom");
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  const go = (period: string, extra = "") =>
    router.push(`/invoices?tab=dashboard&period=${period}${extra}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        Период:
      </span>
      {PRESETS.map((p) => {
        const active = kind === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => go(p.id)}
            className={`px-3 py-1 rounded-md border font-mono text-[10px] uppercase tracking-[0.15em] transition ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
            }`}
          >
            {p.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setCustomOpen((v) => !v)}
        className={`px-3 py-1 rounded-md border font-mono text-[10px] uppercase tracking-[0.15em] transition ${
          kind === "custom"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
        }`}
      >
        Свой
      </button>

      {customOpen ? (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={f}
            onChange={(e) => setF(e.target.value)}
            className="h-8 px-2 rounded-md border border-input bg-transparent font-mono text-[11px] dark:bg-input/30"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="date"
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="h-8 px-2 rounded-md border border-input bg-transparent font-mono text-[11px] dark:bg-input/30"
          />
          <button
            type="button"
            disabled={!f || !t || f > t}
            onClick={() => go("custom", `&from=${f}&to=${t}`)}
            className="px-3 py-1.5 rounded-md border border-primary/40 bg-primary/10 font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:bg-primary/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            OK
          </button>
        </div>
      ) : null}
    </div>
  );
}
