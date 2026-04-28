import Link from "next/link";
import type { Project, ProjectMember } from "@/lib/schemas";
import { buyRate, marginPerHour } from "@/lib/calc";

export type DevCardEntry = {
  name: string;
  empType: "staff" | "freelancer";
  fired: boolean;
  rows: Array<{
    member: ProjectMember;
    project: Project | undefined;
  }>;
};

export function DevCard({ entry }: { entry: DevCardEntry }) {
  const { name, empType, rows, fired } = entry;
  const projCount = new Set(rows.map((r) => r.member.project_id)).size;
  const totalMargin = rows.reduce(
    (s, r) => s + marginPerHour(r.member) * (r.member.hours_load || 0),
    0,
  );

  return (
    <Link
      href={`/projects/devs/${encodeURIComponent(name)}`}
      className={`group block rounded-md border bg-card p-4 transition hover:border-primary/60 ${
        fired ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-full bg-muted text-muted-foreground font-mono text-[10px] flex items-center justify-center shrink-0">
            {name
              .split(" ")
              .map((w) => w[0] ?? "")
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg tracking-wide leading-tight text-foreground group-hover:text-primary transition truncate">
              {name}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {empType === "staff" ? "Штатный" : "Фрилансер"} ·{" "}
              {projCount} {projCount === 1 ? "проект" : "проектов"}
            </div>
          </div>
        </div>
        {fired ? (
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded border border-bad/40 text-bad bg-bad/10">
            Уволен
          </span>
        ) : null}
      </div>

      {/* per-project rows — project name on its own line, rates stack below */}
      <div className="space-y-2.5">
        {rows.map((r) => {
          const m = r.member;
          const buy = buyRate(m);
          const margin = marginPerHour(m);
          const marginClass =
            margin >= 20 ? "text-good" : margin > 0 ? "text-warn" : "text-bad";
          return (
            <div key={m.id} className="space-y-1">
              {/* project name + status */}
              <div className="flex items-baseline justify-between gap-2 text-[11px] font-mono min-w-0">
                <span className="truncate text-foreground/90">
                  {r.project?.name ?? "—"}
                  {m.is_active === false ? (
                    <span className="text-[9px] text-muted-foreground ml-1.5">(end)</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-[10px] shrink-0 whitespace-nowrap">
                  {m.hours_load || 0} ч/мес
                </span>
              </div>
              {/* rates row */}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <RateCell label="buy" value={`$${buy.toFixed(2)}`} />
                <RateCell label="sell" value={`$${(m.sell_rate || 0).toFixed(0)}`} />
                <RateCell
                  label="маржа"
                  value={`${margin >= 0 ? "+" : ""}$${margin.toFixed(2)}/h`}
                  cls={marginClass}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] font-mono">
        <span className="text-muted-foreground uppercase tracking-[0.15em]">
          Маржа всего
        </span>
        <span
          className={`font-display text-base ${totalMargin >= 0 ? "text-primary" : "text-bad"}`}
        >
          {totalMargin >= 0 ? "+" : ""}${Math.round(totalMargin).toLocaleString()} /мес
        </span>
      </div>
    </Link>
  );
}

function RateCell({
  label,
  value,
  cls,
}: {
  label: string;
  value: string;
  cls?: string;
}) {
  return (
    <div className="min-w-0">
      <span className="text-muted-foreground text-[9px] uppercase tracking-[0.1em] mr-1">
        {label}
      </span>
      <span className={cls ?? "text-foreground"}>{value}</span>
    </div>
  );
}
