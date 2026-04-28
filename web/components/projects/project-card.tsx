import Link from "next/link";
import type { Project, ProjectMember } from "@/lib/schemas";
import { aggregateProject, fmtMoney, fmtDate } from "@/lib/calc";

export function ProjectCard({
  project,
  members,
  compact = false,
}: {
  project: Project;
  members: ProjectMember[];
  compact?: boolean;
}) {
  const a = aggregateProject(members);
  const status = project.status ?? "active";
  const lowMargin = a.activeCount > 0 && a.avgMargH < 20;

  // Compact (grid) view: stack cells in 2 cols, fewer KPIs
  // List view (default): full-width row with 6 columns
  const gridCls = compact
    ? "grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-mono"
    : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 text-[11px] font-mono";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-md border bg-card p-5 transition hover:border-primary/60"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h3 className="font-display text-2xl tracking-wide leading-none text-foreground group-hover:text-primary transition min-w-0 truncate">
          {project.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {lowMargin ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-bad inline-flex items-center gap-1">
              △ низкая маржа
            </span>
          ) : null}
          <StatusPill status={status} />
        </div>
      </div>

      <div className={gridCls}>
        <Cell label="Старт" value={fmtDate(project.start_date)} />
        {compact ? null : (
          <Cell
            label="Продолжительность"
            value={project.expected_duration ?? "—"}
          />
        )}
        <Cell label="Команда" value={`${a.activeCount} чел.`} />
        <Cell
          label="Маржа/мес"
          value={fmtMoney(a.totalMargin)}
          accent={a.totalMargin > 0}
          tone={a.totalMargin > 0 ? "good" : "bad"}
        />
        <Cell label="Rev/мес" value={fmtMoney(a.totalRev)} />
        <Cell
          label="Ср. маржа"
          value={`$${a.avgMargH.toFixed(1)}/h`}
          tone={a.avgMargH >= 20 ? "good" : a.avgMargH > 0 ? "warn" : "bad"}
        />
      </div>

      {project.notes ? (
        <p className="mt-3 text-xs italic text-muted-foreground line-clamp-1">
          {project.notes}
        </p>
      ) : null}
    </Link>
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
  tone?: "good" | "bad" | "warn";
}) {
  const colorClass =
    accent && tone === "good"
      ? "text-primary"
      : tone === "good"
        ? "text-good"
        : tone === "bad"
          ? "text-bad"
          : tone === "warn"
            ? "text-warn"
            : "text-foreground";
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground uppercase tracking-[0.08em] text-[10px] mb-0.5 truncate">
        {label}
      </div>
      <div className={`font-semibold truncate ${colorClass}`}>{value}</div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "active",
  completed: "completed",
  paused: "paused",
};

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "border-good/40 text-good bg-good/10"
      : status === "paused"
        ? "border-warn/40 text-warn bg-warn/10"
        : "border-muted-foreground/30 text-muted-foreground bg-muted/30";
  return (
    <span
      className={`text-[10px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded border ${tone}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
