import Link from "next/link";
import type { Project, ProjectMember, DevStatus } from "@/lib/schemas";
import {
  HOURS_PER_MONTH,
  buyRate,
  marginPerHour,
  monthlyRevenue,
  monthlyMargin,
  fmtRate,
} from "@/lib/calc";
import { MoneyValue, MoneyToggle } from "./money-value";
import {
  FULL_DAY_HOURS,
  BENCH_THRESHOLD,
  type LoadEntry,
} from "./load-list";

const ENDING_SOON_DAYS = 30;
const OVERLOAD_PCT = 120;

type DashboardProps = {
  activeProjects: Project[];
  members: ProjectMember[];
  devStatuses: Record<string, DevStatus>;
  loadEntries: LoadEntry[];
};

export function ProjectsDashboard({
  activeProjects,
  members,
  devStatuses,
  loadEntries,
}: DashboardProps) {
  const stats = computeStats(activeProjects, members, devStatuses);

  return (
    <div className="space-y-6">
      <FinancialKpis stats={stats} />
      <div className="grid gap-4 lg:grid-cols-3">
        <TopByRevenue list={stats.topByRev} />
        <TopByMargin list={stats.topByMargin} />
        <LowMarginProjects list={stats.lowMarginProjects} />
      </div>
      <UtilizationSection loadEntries={loadEntries} />
      <AlertsSection stats={stats} loadEntries={loadEntries} />
    </div>
  );
}

/* ─── financial KPIs ────────────────────────────────────────────────── */

function FinancialKpis({ stats }: { stats: Stats }) {
  const marginPctCls =
    stats.avgMarginPct >= 40
      ? "text-good"
      : stats.avgMarginPct > 20
        ? "text-warn"
        : "text-bad";
  const utilCls =
    stats.utilizationPct >= 100
      ? "text-good"
      : stats.utilizationPct >= 70
        ? "text-warn"
        : "text-bad";

  return (
    <section className="rounded-md border bg-card p-4 flex flex-wrap items-center gap-4">
      <Kpi
        label="Rev/мес"
        value={<MoneyValue value={`$${fmtMoney(stats.totalRev)}`} />}
      />
      <Kpi
        label="Cost/мес"
        value={<MoneyValue value={`$${fmtMoney(stats.totalCost)}`} />}
      />
      <Kpi
        label="Маржа/мес"
        value={<MoneyValue value={`$${fmtMoney(stats.totalMargin)}`} />}
        tone="info"
      />
      <Kpi
        label="Маржа %"
        value={`${stats.avgMarginPct.toFixed(1)}%`}
        cls={marginPctCls}
      />
      <Kpi
        label="Утилизация"
        value={`${stats.utilizationPct.toFixed(0)}%`}
        cls={utilCls}
        hint={`${stats.staffHeadcount} штатных`}
      />
      <MoneyToggle />
      <div className="ml-auto pl-4 border-l border-border font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
        {activeProjectsCount(stats)} активных · {stats.activeMemberCount} позиций
      </div>
    </section>
  );
}

function activeProjectsCount(stats: Stats) {
  return stats.projectStats.length;
}

function Kpi({
  label,
  value,
  tone,
  cls,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "info" | "good" | "warn" | "bad";
  cls?: string;
  hint?: string;
}) {
  const toneCls =
    cls ??
    (tone === "good"
      ? "text-good"
      : tone === "info"
        ? "text-info"
        : tone === "warn"
          ? "text-warn"
          : tone === "bad"
            ? "text-bad"
            : "text-foreground");
  return (
    <div className="min-w-[120px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-display text-2xl leading-none ${toneCls}`}>
        {value}
      </div>
      {hint ? (
        <div className="font-mono text-[9px] text-muted-foreground mt-1 uppercase tracking-[0.1em]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/* ─── top projects ──────────────────────────────────────────────────── */

function TopByRevenue({ list }: { list: ProjectStat[] }) {
  const max = list[0]?.rev ?? 0;
  return (
    <DashCard title="Топ по выручке">
      {list.length === 0 ? (
        <EmptyHint>Нет данных</EmptyHint>
      ) : (
        <ul className="space-y-2 font-mono text-xs">
          {list.map((p) => (
            <li key={p.project.id} className="flex items-center gap-2">
              <Link
                href={`/projects/${p.project.id}`}
                className="truncate w-[38%] hover:text-primary"
              >
                {p.project.name}
              </Link>
              <Bar
                pct={max > 0 ? (p.rev / max) * 100 : 0}
                tone="good"
              />
              <span className="shrink-0 w-[80px] text-right text-muted-foreground">
                <MoneyValue value={`$${fmtMoney(p.rev)}`} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
}

function TopByMargin({ list }: { list: ProjectStat[] }) {
  return (
    <DashCard title="Топ по марже %">
      {list.length === 0 ? (
        <EmptyHint>Нет данных</EmptyHint>
      ) : (
        <ul className="space-y-2 font-mono text-xs">
          {list.map((p) => (
            <li key={p.project.id} className="flex items-center gap-2">
              <Link
                href={`/projects/${p.project.id}`}
                className="truncate w-[55%] hover:text-primary"
              >
                {p.project.name}
              </Link>
              <Bar pct={Math.min(100, p.marginPct)} tone="good" />
              <span className="shrink-0 w-[55px] text-right text-good">
                {p.marginPct.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
}

function LowMarginProjects({ list }: { list: ProjectStat[] }) {
  return (
    <DashCard title="🚨 Маржа < 20%">
      {list.length === 0 ? (
        <EmptyHint>Всё в порядке</EmptyHint>
      ) : (
        <ul className="space-y-2 font-mono text-xs">
          {list.slice(0, 8).map((p) => (
            <li
              key={p.project.id}
              className="flex items-center justify-between gap-2"
            >
              <Link
                href={`/projects/${p.project.id}`}
                className="truncate hover:text-primary flex-1 min-w-0"
              >
                {p.project.name}
              </Link>
              <span className="shrink-0 text-bad font-semibold">
                {p.marginPct.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  );
}

function Bar({
  pct,
  tone,
}: {
  pct: number;
  tone: "good" | "warn" | "bad";
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const bg =
    tone === "good"
      ? "bg-good/60"
      : tone === "warn"
        ? "bg-warn/60"
        : "bg-bad/60";
  return (
    <div className="flex-1 h-2 rounded bg-muted/40 overflow-hidden">
      <div className={`h-full ${bg}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/* ─── utilization ───────────────────────────────────────────────────── */

function UtilizationSection({ loadEntries }: { loadEntries: LoadEntry[] }) {
  if (loadEntries.length === 0) {
    return (
      <DashCard title="Загрузка штатных">
        <EmptyHint>Нет активных штатных</EmptyHint>
      </DashCard>
    );
  }
  const sorted = [...loadEntries].sort(
    (a, b) => b.hoursPerDay - a.hoursPerDay,
  );
  return (
    <DashCard title="Загрузка штатных">
      <ul className="space-y-1.5 font-mono text-xs">
        {sorted.map((e) => {
          const pct = (e.hoursPerDay / FULL_DAY_HOURS) * 100;
          const tone: "good" | "warn" | "bad" =
            pct >= 100
              ? "good"
              : pct >= BENCH_THRESHOLD * 100
                ? "warn"
                : "bad";
          const toneText =
            tone === "good"
              ? "text-good"
              : tone === "warn"
                ? "text-warn"
                : "text-bad";
          return (
            <li key={e.name} className="flex items-center gap-2">
              <Link
                href={`/projects/devs/${encodeURIComponent(e.name)}`}
                className="truncate w-[28%] hover:text-primary"
              >
                {e.name}
              </Link>
              <Bar pct={Math.min(150, pct)} tone={tone} />
              <span
                className={`shrink-0 w-[140px] text-right ${toneText}`}
              >
                {fmtHours(e.hoursPerDay)} ч/день · {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </DashCard>
  );
}

/* ─── alerts ────────────────────────────────────────────────────────── */

function AlertsSection({
  stats,
  loadEntries,
}: {
  stats: Stats;
  loadEntries: LoadEntry[];
}) {
  const bench = loadEntries.filter(
    (e) => e.hoursPerDay < FULL_DAY_HOURS * BENCH_THRESHOLD,
  );
  const overload = loadEntries.filter(
    (e) => (e.hoursPerDay / FULL_DAY_HOURS) * 100 >= OVERLOAD_PCT,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DashCard title={`🟥 Низкая маржа · ${stats.lowMarginMembers.length}`}>
        {stats.lowMarginMembers.length === 0 ? (
          <EmptyHint>Все позиции выше порога</EmptyHint>
        ) : (
          <ul className="space-y-1.5 font-mono text-xs">
            {stats.lowMarginMembers.slice(0, 8).map((row) => (
              <li
                key={row.member.id}
                className="flex items-center justify-between gap-2"
              >
                <Link
                  href={`/projects/${row.project.id}`}
                  className="truncate hover:text-primary flex-1 min-w-0"
                >
                  {row.member.dev_name}
                  <span className="text-muted-foreground">
                    {" "}
                    · {row.project.name}
                  </span>
                </Link>
                <span className="shrink-0 text-bad">
                  {fmtRate(row.marginHourly)}/h
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      <DashCard title={`🪑 На бенче · ${bench.length}`}>
        {bench.length === 0 ? (
          <EmptyHint>Все загружены 50%+</EmptyHint>
        ) : (
          <ul className="space-y-1.5 font-mono text-xs">
            {bench.slice(0, 8).map((e) => {
              const pct = (e.hoursPerDay / FULL_DAY_HOURS) * 100;
              return (
                <li
                  key={e.name}
                  className="flex items-center justify-between gap-2"
                >
                  <Link
                    href={`/projects/devs/${encodeURIComponent(e.name)}`}
                    className="truncate hover:text-primary flex-1 min-w-0"
                  >
                    {e.name}
                  </Link>
                  <span className="shrink-0 text-bad">
                    {fmtHours(e.hoursPerDay)} ч/день · {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
            {bench.length > 8 ? (
              <li className="text-muted-foreground italic">
                <Link href="/projects?tab=load&load=bench" className="hover:text-primary">
                  …и ещё {bench.length - 8} →
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </DashCard>

      <DashCard title={`🔥 Перегруз · ${overload.length}`}>
        {overload.length === 0 ? (
          <EmptyHint>Никто не перегружен</EmptyHint>
        ) : (
          <ul className="space-y-1.5 font-mono text-xs">
            {overload.map((e) => {
              const pct = (e.hoursPerDay / FULL_DAY_HOURS) * 100;
              return (
                <li
                  key={e.name}
                  className="flex items-center justify-between gap-2"
                >
                  <Link
                    href={`/projects/devs/${encodeURIComponent(e.name)}`}
                    className="truncate hover:text-primary flex-1 min-w-0"
                  >
                    {e.name}
                  </Link>
                  <span className="shrink-0 text-warn">
                    {fmtHours(e.hoursPerDay)} ч/день · {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </DashCard>

      <DashCard
        title={`⏰ Скоро заканчиваются · ${stats.endingSoon.length}`}
      >
        {stats.endingSoon.length === 0 ? (
          <EmptyHint>Никто не уходит в ближайшие 30 дней</EmptyHint>
        ) : (
          <ul className="space-y-1.5 font-mono text-xs">
            {stats.endingSoon.slice(0, 8).map((row) => (
              <li
                key={row.member.id}
                className="flex items-center justify-between gap-2"
              >
                <Link
                  href={`/projects/${row.project.id}`}
                  className="truncate hover:text-primary flex-1 min-w-0"
                >
                  {row.member.dev_name}
                  <span className="text-muted-foreground">
                    {" "}
                    · {row.project.name}
                  </span>
                </Link>
                <span className="shrink-0 text-warn">
                  {row.daysLeft} дн · {fmtDate(row.member.dev_end_date!)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      <DashCard
        title={`📊 Проекты без выручки · ${stats.noRevProjects.length}`}
      >
        {stats.noRevProjects.length === 0 ? (
          <EmptyHint>У всех активных есть выручка</EmptyHint>
        ) : (
          <ul className="space-y-1.5 font-mono text-xs">
            {stats.noRevProjects.map((p) => (
              <li key={p.project.id}>
                <Link
                  href={`/projects/${p.project.id}`}
                  className="hover:text-primary truncate block"
                >
                  {p.project.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashCard>
    </div>
  );
}

/* ─── shared bits ───────────────────────────────────────────────────── */

function DashCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs italic text-muted-foreground py-2">
      {children}
    </p>
  );
}

/* ─── compute helpers ───────────────────────────────────────────────── */

type ProjectStat = {
  project: Project;
  rev: number;
  margin: number;
  cost: number;
  marginPct: number;
  headcount: number;
};

type LowMarginRow = {
  member: ProjectMember;
  project: Project;
  marginHourly: number;
};

type EndingSoonRow = {
  member: ProjectMember;
  project: Project;
  daysLeft: number;
};

type Stats = {
  totalRev: number;
  totalCost: number;
  totalMargin: number;
  avgMarginPct: number;
  staffHeadcount: number;
  utilizationPct: number;
  activeMemberCount: number;
  projectStats: ProjectStat[];
  topByRev: ProjectStat[];
  topByMargin: ProjectStat[];
  lowMarginProjects: ProjectStat[];
  lowMarginMembers: LowMarginRow[];
  endingSoon: EndingSoonRow[];
  noRevProjects: ProjectStat[];
};

function computeStats(
  activeProjects: Project[],
  members: ProjectMember[],
  devStatuses: Record<string, DevStatus>,
): Stats {
  const projById = new Map(activeProjects.map((p) => [p.id, p]));
  const active = members.filter(
    (m) => projById.has(m.project_id) && m.is_active !== false,
  );

  // Revenue / margin per member uses existing per-row calc (followers
  // in groups have sell_rate = 0, so they contribute 0 to revenue,
  // which is correct).
  let totalRev = 0;
  let totalMargin = 0;
  for (const m of active) {
    totalRev += monthlyRevenue(m);
    totalMargin += monthlyMargin(m);
  }

  // Cost: staff cost is the dev's salary (one per dev, even if they
  // appear on multiple projects); freelance cost is buy × hours per
  // row. Staff salaries are deduped by dev_name (we take the max
  // across their rows since values *should* be the same).
  const staffSalary = new Map<string, number>();
  let freelanceCost = 0;
  for (const m of active) {
    if (m.employment_type === "staff") {
      const cur = staffSalary.get(m.dev_name) ?? 0;
      const s = m.salary ?? 0;
      if (s > cur) staffSalary.set(m.dev_name, s);
    } else {
      freelanceCost += (m.buy_rate || 0) * (m.hours_load || 0);
    }
  }
  const staffCost = Array.from(staffSalary.values()).reduce(
    (s, x) => s + x,
    0,
  );
  const totalCost = staffCost + freelanceCost;

  const avgMarginPct = totalRev > 0 ? (totalMargin / totalRev) * 100 : 0;

  // Utilization: only active, not-inactive staff devs.
  const staffHoursByDev = new Map<string, number>();
  for (const m of active) {
    if (m.employment_type !== "staff") continue;
    if (devStatuses[m.dev_name]?.status === "inactive") continue;
    const cur = staffHoursByDev.get(m.dev_name) ?? 0;
    staffHoursByDev.set(m.dev_name, cur + (m.hours_load ?? 0));
  }
  const staffHeadcount = staffHoursByDev.size;
  const sumStaffHours = Array.from(staffHoursByDev.values()).reduce(
    (s, x) => s + x,
    0,
  );
  const utilizationPct =
    staffHeadcount > 0
      ? (sumStaffHours / (staffHeadcount * HOURS_PER_MONTH)) * 100
      : 0;

  // Per-project aggregates.
  const projAgg = new Map<
    string,
    { rev: number; margin: number; cost: number; n: number }
  >();
  for (const m of active) {
    const cur = projAgg.get(m.project_id) ?? {
      rev: 0,
      margin: 0,
      cost: 0,
      n: 0,
    };
    cur.rev += monthlyRevenue(m);
    cur.margin += monthlyMargin(m);
    if (m.employment_type === "staff") {
      // Approximate: cost = revenue - margin (i.e. what the company
      // effectively "uses" from this row). Avoids double-counting
      // salary across projects.
      cur.cost += monthlyRevenue(m) - monthlyMargin(m);
    } else {
      cur.cost += (m.buy_rate || 0) * (m.hours_load || 0);
    }
    cur.n++;
    projAgg.set(m.project_id, cur);
  }
  const projectStats: ProjectStat[] = activeProjects.map((p) => {
    const a = projAgg.get(p.id) ?? { rev: 0, margin: 0, cost: 0, n: 0 };
    return {
      project: p,
      rev: a.rev,
      margin: a.margin,
      cost: a.cost,
      marginPct: a.rev > 0 ? (a.margin / a.rev) * 100 : 0,
      headcount: a.n,
    };
  });

  const topByRev = [...projectStats]
    .filter((p) => p.rev > 0)
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 7);
  const topByMargin = [...projectStats]
    .filter((p) => p.rev > 0)
    .sort((a, b) => b.marginPct - a.marginPct)
    .slice(0, 7);
  const lowMarginProjects = projectStats
    .filter((p) => p.rev > 0 && p.marginPct < 20)
    .sort((a, b) => a.marginPct - b.marginPct);
  const noRevProjects = projectStats.filter((p) => p.rev === 0);

  // Low-margin members ($/h): margin per hour < 20, members that
  // actually sell something (sell > 0 — followers don't show up).
  const lowMarginMembers: LowMarginRow[] = [];
  for (const m of active) {
    if ((m.sell_rate || 0) <= 0) continue;
    const mh = marginPerHour(m);
    if (mh >= 20) continue;
    const project = projById.get(m.project_id)!;
    lowMarginMembers.push({ member: m, project, marginHourly: mh });
  }
  lowMarginMembers.sort((a, b) => a.marginHourly - b.marginHourly);

  // Ending soon: members with dev_end_date in [today, today+30d].
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + ENDING_SOON_DAYS);
  const endingSoon: EndingSoonRow[] = [];
  for (const m of active) {
    if (!m.dev_end_date) continue;
    const d = new Date(m.dev_end_date);
    if (isNaN(d.getTime())) continue;
    if (d < today || d > horizon) continue;
    const daysLeft = Math.round(
      (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    endingSoon.push({
      member: m,
      project: projById.get(m.project_id)!,
      daysLeft,
    });
  }
  endingSoon.sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    totalRev,
    totalCost,
    totalMargin,
    avgMarginPct,
    staffHeadcount,
    utilizationPct,
    activeMemberCount: active.length,
    projectStats,
    topByRev,
    topByMargin,
    lowMarginProjects,
    lowMarginMembers,
    endingSoon,
    noRevProjects,
  };
}

function fmtMoney(v: number) {
  return Math.round(v).toLocaleString("en-US");
}

function fmtHours(v: number) {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? r.toString() : r.toFixed(1);
}

function fmtDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
