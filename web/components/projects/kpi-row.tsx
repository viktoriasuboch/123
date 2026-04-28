import type { ProjectMember } from "@/lib/schemas";
import { aggregateProject, fmtMoney } from "@/lib/calc";

export function KpiRow({ members }: { members: ProjectMember[] }) {
  const a = aggregateProject(members);

  const items: Array<[string, string, string]> = [
    ["Всего в команде", `${a.teamSize} чел.`, "text-foreground"],
    ["Активных", `${a.activeCount} чел.`, "text-foreground"],
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
    <div className="flex flex-wrap gap-3 mb-7">
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
  );
}
