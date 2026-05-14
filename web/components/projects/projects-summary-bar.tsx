"use client";

import { useEffect, useState } from "react";
import type { Project, ProjectMember } from "@/lib/schemas";
import { buyRate, marginPerHour, monthlyRevenue, monthlyMargin } from "@/lib/calc";

const LS_KEY = "lb_money_visible";

export function ProjectsSummaryBar({
  projects,
  membersByProject,
  label,
}: {
  projects: Project[];
  membersByProject: Map<string, ProjectMember[]>;
  label: string;
}) {
  const ids = new Set(projects.map((p) => p.id));
  const all = Array.from(membersByProject.values()).flat();
  const a = all.filter((m) => ids.has(m.project_id) && m.is_active !== false);
  const n = a.length;

  const avgBuy = n === 0 ? 0 : a.reduce((s, m) => s + buyRate(m), 0) / n;
  const avgSell = n === 0 ? 0 : a.reduce((s, m) => s + (m.sell_rate || 0), 0) / n;
  // % margin: avg of per-row (margin / sell) where sell > 0
  const validRows = a.filter((m) => (m.sell_rate || 0) > 0);
  const avgMarginPct =
    validRows.length === 0
      ? 0
      : (validRows.reduce(
          (s, m) => s + marginPerHour(m) / (m.sell_rate || 1),
          0,
        ) /
          validRows.length) *
        100;

  const totRev = a.reduce((s, m) => s + monthlyRevenue(m), 0);
  const totMargin = a.reduce((s, m) => s + monthlyMargin(m), 0);

  // Money figures (Rev/мес, Маржа/мес) are hidden by default; the user
  // can reveal them with the eye toggle. The choice persists in
  // localStorage so the next page load remembers it.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(LS_KEY) === "1") setVisible(true);
    } catch {
      /* localStorage might be unavailable (SSR, private mode) — fine. */
    }
  }, []);
  const toggle = () => {
    setVisible((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(LS_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="rounded-md border bg-card/60 p-4 mb-5 flex flex-wrap gap-4 items-center">
      <Cell label="Ср. buy" value={`$${avgBuy.toFixed(1)}/h`} accent />
      <Cell label="Ср. sell" value={`$${avgSell.toFixed(1)}/h`} tone="good" />
      <Cell
        label="Ср. маржа"
        value={`${avgMarginPct.toFixed(1)}%`}
        tone={avgMarginPct >= 40 ? "good" : avgMarginPct > 20 ? "warn" : "bad"}
      />
      <Cell
        label="Rev/мес"
        value={
          visible ? `$${Math.round(totRev).toLocaleString()}` : "$•••"
        }
      />
      <Cell
        label="Маржа/мес"
        value={
          visible ? `$${Math.round(totMargin).toLocaleString()}` : "$•••"
        }
        tone="info"
      />
      <button
        type="button"
        onClick={toggle}
        title={visible ? "Скрыть суммы" : "Показать суммы"}
        aria-label={visible ? "Скрыть суммы" : "Показать суммы"}
        aria-pressed={visible}
        className="inline-flex items-center justify-center size-8 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      <div className="ml-auto pl-4 border-l border-border font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
        {label} · {projects.length} пр. · {n} позиций
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "good" | "info" | "warn" | "bad";
}) {
  const cls = accent
    ? "text-primary"
    : tone === "good"
      ? "text-good"
      : tone === "info"
        ? "text-info"
        : tone === "warn"
          ? "text-warn"
          : tone === "bad"
            ? "text-bad"
            : "text-foreground";
  return (
    <div className="min-w-[110px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-display text-xl leading-none ${cls}`}>{value}</div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 2.5l12 11" />
      <path d="M4 4.5C2.6 5.7 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1.2 0 2.2-.3 3.1-.8" />
      <path d="M6.6 4.1A6.6 6.6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8c-.4.8-1 1.6-1.7 2.3" />
      <path d="M9.4 9.4a2 2 0 0 1-2.8-2.8" />
    </svg>
  );
}
