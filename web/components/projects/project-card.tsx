import Link from "next/link";
import type { Project, ProjectMember } from "@/lib/schemas";
import { aggregateProject, fmtMoney, fmtDate } from "@/lib/calc";

export function ProjectCard({
  project,
  members,
}: {
  project: Project;
  members: ProjectMember[];
}) {
  const a = aggregateProject(members);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-md border bg-card p-5 transition hover:border-primary/60"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display text-2xl tracking-wide leading-none text-foreground group-hover:text-primary transition">
          {project.name}
        </h3>
        <StatusPill status={project.status ?? "active"} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px] font-mono">
        <Cell label="Старт" value={fmtDate(project.start_date)} />
        <Cell label="Команда" value={`${a.activeCount}/${a.teamSize} чел.`} />
        <Cell label="Rev/мес" value={fmtMoney(a.totalRev)} accent />
        <Cell label="Маржа/мес" value={fmtMoney(a.totalMargin)} tone={a.totalMargin > 0 ? "good" : "bad"} />
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
    tone === "good"
      ? "text-good"
      : tone === "bad"
      ? "text-bad"
      : tone === "warn"
      ? "text-warn"
      : accent
      ? "text-primary"
      : "text-foreground";
  return (
    <div>
      <div className="uppercase tracking-[0.15em] text-[9px] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-display text-lg leading-none ${colorClass}`}>{value}</div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "Активный",
  completed: "Завершён",
  paused: "Пауза",
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
      className={`text-[9px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded border ${tone}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
