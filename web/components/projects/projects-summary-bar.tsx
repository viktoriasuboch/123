import type { Project, ProjectMember } from "@/lib/schemas";
import { buyRate, marginPerHour, monthlyRevenue, monthlyMargin } from "@/lib/calc";

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

  return (
    <div className="rounded-md border bg-card/60 p-4 mb-5 flex flex-wrap gap-4 items-center">
      <Cell label="Ср. buy" value={`$${avgBuy.toFixed(1)}/h`} accent />
      <Cell label="Ср. sell" value={`$${avgSell.toFixed(1)}/h`} tone="good" />
      <Cell
        label="Ср. маржа"
        value={`${avgMarginPct.toFixed(1)}%`}
        tone={avgMarginPct >= 40 ? "good" : avgMarginPct > 20 ? "warn" : "bad"}
      />
      <Cell label="Rev/мес" value={`$${Math.round(totRev).toLocaleString()}`} />
      <Cell
        label="Маржа/мес"
        value={`$${Math.round(totMargin).toLocaleString()}`}
        tone="info"
      />
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
