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
  biweeklyNextISO,
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
  const live = projectList.filter((p) => {
    const st = p.status ?? "active";
    return st === "active" || st === "support";
  });
  const normalProjects = live.filter((p) => !isHays(p.name));
  const haysProjects = live.filter((p) => isHays(p.name));
  const templateByProject = new Map<string, InvoiceTemplate>();
  for (const t of templates) {
    if (t.active === false) continue;
    if (!templateByProject.has(t.project_id)) templateByProject.set(t.project_id, t);
  }

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
          title="Проекты"
          projects={normalProjects}
          templateByProject={templateByProject}
          projectOptions={projectOptions}
          today={today}
        />
        <ProjectBillingSection
          title="HAYS"
          projects={haysProjects}
          templateByProject={templateByProject}
          projectOptions={projectOptions}
          today={today}
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
  templateByProject,
  projectOptions,
  today,
}: {
  title: string;
  projects: ProjectLite[];
  templateByProject: Map<string, InvoiceTemplate>;
  projectOptions: ProjectOption[];
  today: Date;
}) {
  return (
    <section className="rounded-md border bg-card">
      <header className="p-4 border-b">
        <h3 className="font-display text-lg tracking-wide leading-none">{title}</h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
          {projects.length} · когда выставлять
        </p>
      </header>
      {projects.length === 0 ? (
        <p className="p-6 text-center font-mono text-xs text-muted-foreground">
          Нет проектов.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {projects.map((p) => {
            const t = templateByProject.get(p.id);
            const opt = projectOptions.find((o) => o.id === p.id);
            const planned = opt?.planned_monthly ?? 0;
            let nextISO: string | null = null;
            let amount = 0;
            let currency = t?.currency ?? "USD";
            if (t) {
              if ((t.frequency ?? "monthly") === "biweekly") {
                nextISO = biweeklyNextISO(t.next_issue_date, today);
                amount = planned / 2;
              } else if (t.issue_day) {
                nextISO = monthlyReminderDue(t.issue_day, t.created_at, today).dueISO;
                amount = planned;
              }
              currency = t.currency ?? currency;
            }
            return (
              <li key={p.id} className="p-3 flex items-center justify-between gap-3">
                <Link
                  href={`/invoices/projects/${p.id}`}
                  className="min-w-0 flex-1 group"
                >
                  <div className="font-medium truncate group-hover:text-primary transition">
                    {p.name}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {t ? `выставить ${fmtDate(nextISO)}` : "напоминание не настроено"}
                  </div>
                </Link>
                {t && amount > 0 ? (
                  <div className="font-mono text-sm text-muted-foreground shrink-0">
                    ≈ {currency} {fmtAmt(amount)}
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
