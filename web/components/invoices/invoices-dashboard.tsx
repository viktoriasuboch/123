import Link from "next/link";
import type {
  Invoice,
  InvoiceTemplate,
  DocumentReminder,
} from "@/lib/schemas";
import type { ProjectOption } from "./invoice-template-dialog";
import {
  fmtDate,
  monthlyReminderDue,
  adjustedIssueDateISO,
  forecastIssuanceByCurrency,
  type DashboardPeriod,
} from "@/lib/calc";
import { bucketToUsd } from "@/lib/fx";
import { effectiveStatus } from "./invoice-status-badge";
import { DashboardPeriodFilter } from "./dashboard-period-filter";
import { DashboardOverviewChart, type OverviewBucket } from "./dashboard-overview-chart";
import { OverdueList, type OverdueItem } from "./overdue-list";
import {
  TodayWidget,
  type TodayIssueItem,
  type TodayDocumentItem,
} from "./today-widget";

type Bucket = Record<string, number>;
type ProjectLite = { id: string; name: string; status?: string | null };

const RU_MONTHS = [
  "Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек",
];
const isHays = (n: string) => /hays/i.test(n);
const dateKey = (iso: string | null | undefined) => iso?.slice(0, 10) ?? "";
const inPeriod = (iso: string | null | undefined, p: DashboardPeriod) => {
  const k = dateKey(iso);
  return !!k && k >= p.from && k <= p.to;
};
const bump = (b: Bucket, c: string, v: number) => {
  b[c] = (b[c] ?? 0) + v;
};
const fmtAmt = (v: number) =>
  v.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function InvoicesDashboard({
  invoices,
  templates,
  projectList,
  projectOptions,
  projectsById,
  period,
  overdue,
  rates,
  toIssueDue,
  documentsDue,
}: {
  invoices: Invoice[];
  templates: InvoiceTemplate[];
  projectList: ProjectLite[];
  projectOptions: ProjectOption[];
  projectsById: Map<string, { id: string; name: string }>;
  period: DashboardPeriod;
  overdue: OverdueItem[];
  rates: Record<string, number>;
  toIssueDue: TodayIssueItem[];
  documentsDue: TodayDocumentItem[];
}) {
  const today = new Date();

  // ── KPI buckets ───────────────────────────────────────────────────
  const issued: Bucket = {}; // issued within period
  const paid: Bucket = {}; // paid within period
  const receivable: Bucket = {}; // issued, unpaid, not overdue (as of now)
  const overdueB: Bucket = {}; // overdue as of now
  const overdueByMonthAgnostic: Bucket = {};

  for (const inv of invoices) {
    const s = effectiveStatus(inv);
    if (s === "cancelled") continue;
    if (inPeriod(inv.issue_date, period)) bump(issued, inv.currency, inv.amount);
    if (s === "paid") {
      if (inPeriod(inv.paid_date, period))
        bump(paid, inv.currency, inv.paid_amount ?? inv.amount);
    } else if (s === "overdue") {
      bump(overdueB, inv.currency, inv.amount);
    } else if (s === "issued" || s === "to_issue") {
      bump(receivable, inv.currency, inv.amount);
    }
  }
  void overdueByMonthAgnostic;
  const forecast = forecastIssuanceByCurrency(templates, period, today);

  // ── overview chart buckets: Просрочено + receipts by due-month ────
  const byMonth = new Map<string, Bucket>();
  for (const inv of invoices) {
    const s = effectiveStatus(inv);
    if (s === "issued" && inv.due_date) {
      const ym = dateKey(inv.due_date).slice(0, 7);
      const b = byMonth.get(ym) ?? {};
      bump(b, inv.currency, inv.amount);
      byMonth.set(ym, b);
    }
  }
  const chartBuckets: OverviewBucket[] = [];
  if (Object.keys(overdueB).length > 0) {
    chartBuckets.push({ label: "Просрочено", overdue: true, values: overdueB });
  }
  for (const ym of [...byMonth.keys()].sort()) {
    const [, m] = ym.split("-");
    chartBuckets.push({ label: RU_MONTHS[parseInt(m, 10) - 1], values: byMonth.get(ym)! });
  }

  const hasAction = toIssueDue.length > 0 || documentsDue.length > 0;

  // ── project billing sections (обычные / HAYS) ─────────────────────
  // Only what needs issuing within a week (or already missed) shows
  // here; once issued the next date jumps past the horizon and the row
  // drops off. Missed rows (nextISO < today) keep hanging.
  const todayISO = localISO(today);
  const horizonISO = addDaysISO(todayISO, 7);
  const y = today.getFullYear();
  const m = today.getMonth();

  const live = projectList.filter((p) => {
    const st = p.status ?? "active";
    return st === "active" || st === "support";
  });
  const templateByProject = new Map<string, InvoiceTemplate>();
  for (const t of templates) {
    if (t.active === false) continue;
    if (!templateByProject.has(t.project_id)) templateByProject.set(t.project_id, t);
  }
  const lastIssuedByProject = new Map<string, string>();
  for (const inv of invoices) {
    if (!inv.issue_date || effectiveStatus(inv) === "cancelled") continue;
    const iso = dateKey(inv.issue_date);
    const cur = lastIssuedByProject.get(inv.project_id);
    if (!cur || iso > cur) lastIssuedByProject.set(inv.project_id, iso);
  }

  const dueInfo = new Map<
    string,
    { nextISO: string; amount: number; currency: string; missed: boolean }
  >();
  for (const p of live) {
    const t = templateByProject.get(p.id);
    if (!t) continue;
    const planned = projectOptions.find((o) => o.id === p.id)?.planned_monthly ?? 0;
    const lastIssued = lastIssuedByProject.get(p.id) ?? null;
    let nextISO: string | null = null;
    let amount = 0;
    const currency = t.currency ?? "USD";
    if ((t.frequency ?? "monthly") === "biweekly") {
      const base = lastIssued ? addDaysISO(lastIssued, 14) : t.next_issue_date ?? null;
      nextISO = base ? weekendShiftISO(base) : null;
      amount = planned / 2;
    } else if (t.issue_day) {
      const issuedThisMonth =
        lastIssued && lastIssued.slice(0, 7) === todayISO.slice(0, 7);
      nextISO = issuedThisMonth
        ? adjustedIssueDateISO(y, m + 1, t.issue_day)
        : monthlyReminderDue(t.issue_day, t.created_at, today).dueISO;
      amount = planned;
    }
    if (!nextISO || nextISO > horizonISO) continue;
    dueInfo.set(p.id, { nextISO, amount, currency, missed: nextISO < todayISO });
  }
  const normalProjects = live.filter((p) => !isHays(p.name) && dueInfo.has(p.id));
  const haysProjects = live.filter((p) => isHays(p.name) && dueInfo.has(p.id));

  return (
    <div className="space-y-6">
      <DashboardPeriodFilter kind={period.kind} from={period.from} to={period.to} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Выставлено" bucket={issued} rates={rates} tone="muted" />
        <Kpi label="Оплачено" bucket={paid} rates={rates} tone="good" />
        <Kpi label="Ожидается к оплате" bucket={receivable} rates={rates} tone="sky" />
        <Kpi label="Прогноз выставления" bucket={forecast} rates={rates} tone="muted" />
        <Kpi label="Просрочено" bucket={overdueB} rates={rates} tone="bad" />
      </div>

      <DashboardOverviewChart buckets={chartBuckets} />

      {hasAction ? (
        <TodayWidget
          toIssue={toIssueDue}
          documents={documentsDue}
          projects={projectsById}
          projectOptions={projectOptions}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ProjectBillingSection
          title="Проекты · на неделю"
          projects={normalProjects}
          dueInfo={dueInfo}
        />
        <ProjectBillingSection
          title="HAYS · на неделю"
          projects={haysProjects}
          dueInfo={dueInfo}
        />
      </div>

      {overdue.length > 0 ? (
        <OverdueList
          items={overdue}
          projects={projectsById}
          projectOptions={projectOptions}
        />
      ) : null}
    </div>
  );
}

/* ─── KPI tile ─────────────────────────────────────────────────────── */

function Kpi({
  label,
  bucket,
  rates,
  tone,
}: {
  label: string;
  bucket: Bucket;
  rates: Record<string, number>;
  tone: "good" | "bad" | "sky" | "muted";
}) {
  const entries = Object.entries(bucket)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const toneCls =
    tone === "good"
      ? "text-good"
      : tone === "bad"
        ? "text-destructive"
        : tone === "sky"
          ? "text-sky-500"
          : "text-foreground";
  const usd = bucketToUsd(bucket, rates);
  const multi = entries.length > 1;

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
        {label}
      </div>
      {entries.length === 0 ? (
        <div className="font-display text-2xl text-muted-foreground">—</div>
      ) : (
        <div className="space-y-0.5">
          {entries.map(([currency, amount]) => (
            <div key={currency} className={`font-display text-xl leading-tight ${toneCls}`}>
              <span className="font-mono text-[10px] text-muted-foreground mr-1.5">
                {currency}
              </span>
              {fmtAmt(amount)}
            </div>
          ))}
          {multi ? (
            <div className="font-mono text-[10px] text-muted-foreground pt-0.5">
              ≈ ${fmtAmt(usd)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ─── project billing section ──────────────────────────────────────── */

function ProjectBillingSection({
  title,
  projects,
  dueInfo,
}: {
  title: string;
  projects: ProjectLite[];
  dueInfo: Map<
    string,
    { nextISO: string; amount: number; currency: string; missed: boolean }
  >;
}) {
  return (
    <section className="rounded-md border bg-card">
      <header className="p-4 border-b">
        <h3 className="font-display text-lg tracking-wide leading-none">{title}</h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
          {projects.length} · выставить в ближайшие 7 дней
        </p>
      </header>
      {projects.length === 0 ? (
        <p className="p-6 text-center font-mono text-xs text-muted-foreground">
          На неделю ничего не нужно выставлять.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {projects.map((p) => {
            const d = dueInfo.get(p.id)!;
            return (
              <li
                key={p.id}
                className={`p-3 flex items-center justify-between gap-3 ${
                  d.missed ? "bg-destructive/5" : ""
                }`}
              >
                <Link
                  href={`/invoices/projects/${p.id}`}
                  className="min-w-0 flex-1 group"
                >
                  <div className="font-medium truncate group-hover:text-primary transition flex items-center gap-1.5">
                    {d.missed ? (
                      <span className="text-destructive" aria-hidden>❗</span>
                    ) : null}
                    {p.name}
                  </div>
                  <div
                    className={`font-mono text-[10px] ${
                      d.missed ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {d.missed
                      ? `просрочено · выставить ${fmtDate(d.nextISO)}`
                      : `выставить ${fmtDate(d.nextISO)}`}
                  </div>
                </Link>
                {d.amount > 0 ? (
                  <div className="font-mono text-sm text-muted-foreground shrink-0">
                    ≈ {d.currency} {fmtAmt(d.amount)}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ─── local date helpers ───────────────────────────────────────────── */

function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return localISO(d);
}
function weekendShiftISO(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return localISO(d);
}
