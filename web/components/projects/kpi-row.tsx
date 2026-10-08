import type { ProjectMember } from "@/lib/schemas";
import { aggregateProject, fmtMoney } from "@/lib/calc";

export function KpiRow({
  members,
  projectStatus = "active",
}: {
  members: ProjectMember[];
  projectStatus?: string;
}) {
  // A completed project has nobody active, so its live run-rate is $0 by
  // definition. Show the economics of the full team as it was instead.
  const completed = projectStatus === "completed";
  const a = aggregateProject(members, { includeInactive: completed });

  const items: Array<[string, string, string]> = [
    ["Всего в команде", `${a.teamSize} чел.`, "text-foreground"],
    [
      completed ? "В составе" : "Активных",
      `${a.activeCount} чел.`,
      "text-foreground",
    ],
    ["Rev/мес", fmtMoney(a.totalRev), "text-primary"],
    ["Маржа/мес", fmtMoney(a.totalMargin), a.totalMargin > 0 ? "text-good" : "text-bad"],
    [
      "Ср. маржа $/h",
      `$${a.avgMargH.toFixed(1)}`,
      a.avgMargH >= 20 ? "text-good" : a.avgMargH > 0 ? "text-warn" : "text-bad",
    ],
    [
      "Низкая маржа",
      `${a.lowMargin} чел.`,
      a.lowMargin > 0 ? "text-warn" : "text-foreground",
    ],
  ];

  return (
    <div className="mb-7">
      <div className="flex flex-wrap gap-3">
        {items.map(([label, value, cls]) => (
          <div
            key={label}
            className="flex-1 min-w-[110px] rounded-md border bg-card p-3"
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
              {label}
            </div>
            <div className={`font-display text-xl leading-none ${cls}`}>{value}</div>
          </div>
        ))}
      </div>
      {completed ? (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Проект завершён — показатели по полному составу команды, как она была
        </p>
      ) : null}
    </div>
  );
}
