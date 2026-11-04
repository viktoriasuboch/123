import type { ProjectMember } from "@/lib/schemas";
import { aggregateProject, fmtMoney } from "@/lib/calc";

type Kpi = { label: string; value: string; cls: string; note?: string };

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
  const departed = a.teamSize - a.activeCount;

  const items: Kpi[] = [
    {
      label: completed ? "В составе" : "В команде",
      value: `${a.activeCount} чел.`,
      cls: "text-foreground",
      note: !completed && departed > 0 ? `ушли: ${departed}` : undefined,
    },
    { label: "Rev/мес", value: fmtMoney(a.totalRev), cls: "text-primary" },
    {
      label: "Маржа/мес",
      value: fmtMoney(a.totalMargin),
      cls: a.totalMargin > 0 ? "text-good" : "text-bad",
    },
    {
      label: "Ср. маржа $/h",
      value: `$${a.avgMargH.toFixed(1)}`,
      cls: a.avgMargH >= 20 ? "text-good" : a.avgMargH > 0 ? "text-warn" : "text-bad",
    },
    {
      label: "Низкая маржа",
      value: `${a.lowMargin} чел.`,
      cls: a.lowMargin > 0 ? "text-warn" : "text-foreground",
    },
  ];

  return (
    <div className="mb-7">
      <div className="flex flex-wrap gap-3">
        {items.map(({ label, value, cls, note }) => (
          <div
            key={label}
            className="flex-1 min-w-[110px] rounded-md border bg-card p-3"
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
              {label}
            </div>
            <div className={`font-display text-xl leading-none ${cls}`}>{value}</div>
            {note ? (
              <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                {note}
              </div>
            ) : null}
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
