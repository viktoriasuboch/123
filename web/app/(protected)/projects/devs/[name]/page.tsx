import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listProjects,
  listProjectMembers,
  listDevStatuses,
} from "@/lib/data/projects";
import { buyRate, marginPerHour, fmtRate } from "@/lib/calc";
import { DevFireButton } from "@/components/projects/dev-fire-button";

export const dynamic = "force-dynamic";

type Params = Promise<{ name: string }>;

export default async function DevProfilePage({ params }: { params: Params }) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  const [projects, allMembers, statuses] = await Promise.all([
    listProjects(),
    listProjectMembers(),
    listDevStatuses(),
  ]);

  const rows = allMembers.filter((m) => m.dev_name === name);
  if (rows.length === 0) notFound();

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const empType = rows[0].employment_type ?? "freelancer";
  const fired = statuses[name]?.status === "inactive";
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roles = [...new Set(rows.map((r) => r.role).filter(Boolean))].join(", ") || "—";

  const activeRows = rows.filter((r) => r.is_active !== false);
  const monthlyRev = activeRows.reduce(
    (s, m) => s + (m.sell_rate || 0) * (m.hours_load || 0),
    0,
  );
  const monthlyBuy = activeRows.reduce(
    (s, m) => s + buyRate(m) * (m.hours_load || 0),
    0,
  );
  const monthlyMargin = monthlyRev - monthlyBuy;
  // total revenue is intentionally disabled — billing history not tracked yet
  const totalRevEst = 0;

  return (
    <div>
      <Link
        href="/projects?tab=devs"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground inline-block mb-4"
      >
        ← все разработчики
      </Link>

      <div className="flex items-center justify-between gap-6 mb-7 flex-wrap">
        <div className="flex items-center gap-4">
          <div
            className={`size-16 rounded-full flex items-center justify-center font-mono text-sm ${
              fired ? "bg-muted text-muted-foreground" : "bg-muted text-foreground"
            }`}
          >
            {initials}
          </div>
          <div>
            <h1 className="font-display text-4xl tracking-widest text-primary leading-none">
              {name}
            </h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Pill tone="info">{empType === "staff" ? "Штатный" : "Фрилансер"}</Pill>
              <Pill tone={fired ? "bad" : "good"}>
                {fired ? "● уволен" : "● активен"}
              </Pill>
              <span className="font-mono text-[10px] text-muted-foreground">
                Роли: <b className="text-foreground">{roles}</b>
              </span>
            </div>
          </div>
        </div>

        <DevFireButton devName={name} fired={fired} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <Kpi label="Rev/мес" value={`$${Math.round(monthlyRev).toLocaleString()}`} cls="text-primary" />
        <Kpi
          label="Маржа/мес"
          value={`${monthlyMargin >= 0 ? "$" : "-$"}${Math.abs(Math.round(monthlyMargin)).toLocaleString()}`}
          cls={monthlyMargin > 0 ? "text-good" : "text-bad"}
        />
        <Kpi label="Активных пр." value={activeRows.length.toString()} cls="text-foreground" />
        <Kpi label="Всего пр." value={new Set(rows.map((r) => r.project_id)).size.toString()} cls="text-muted-foreground" />
        <Kpi label="≈ Всего rev" value={totalRevEst > 0 ? `$${Math.round(totalRevEst).toLocaleString()}` : "—"} cls="text-special" />
      </div>

      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        Проекты
      </h2>

      <div className="rounded-md border bg-card overflow-x-auto">
        <table className="w-full text-sm font-mono min-w-[820px]">
          <thead>
            <tr className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground border-b">
              <th className="text-left p-3 font-normal">Проект</th>
              <th className="text-left p-3 font-normal">Роль</th>
              <th className="text-right p-3 font-normal">Зарплата</th>
              <th className="text-right p-3 font-normal">Buy</th>
              <th className="text-right p-3 font-normal">Sell</th>
              <th className="text-right p-3 font-normal">Маржа/h</th>
              <th className="text-right p-3 font-normal">ч/день</th>
              <th className="text-right p-3 font-normal">Rev/мес</th>
              <th className="text-left p-3 font-normal">Статус</th>
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort((a, b) => {
                if ((a.is_active === false) !== (b.is_active === false))
                  return a.is_active === false ? 1 : -1;
                const an = projectsById.get(a.project_id)?.name ?? "";
                const bn = projectsById.get(b.project_id)?.name ?? "";
                return an.localeCompare(bn);
              })
              .map((m) => {
                const buy = buyRate(m);
                const margin = marginPerHour(m);
                const revMonth = (m.sell_rate || 0) * (m.hours_load || 0);
                const hpd =
                  Math.round(((m.hours_load || 0) / 20) * 10) / 10;
                const isStaff = m.employment_type === "staff";
                const inactive = m.is_active === false;
                const project = projectsById.get(m.project_id);
                const margClass =
                  margin >= 20
                    ? "text-good"
                    : margin > 0
                    ? "text-warn"
                    : "text-bad";
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-border/50 ${inactive ? "opacity-60" : ""}`}
                  >
                    <td className="p-3">
                      <Link
                        href={`/projects/${m.project_id}`}
                        className="text-primary hover:underline"
                      >
                        {project?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{m.role ?? "—"}</td>
                    <td className="p-3 text-right">
                      {isStaff
                        ? `$${(m.salary || 0).toLocaleString()}/мес`
                        : "—"}
                    </td>
                    <td className="p-3 text-right">{fmtRate(buy)}/h</td>
                    <td className="p-3 text-right text-good">
                      {fmtRate(m.sell_rate || 0)}/h
                    </td>
                    <td className={`p-3 text-right ${margClass}`}>
                      {margin >= 0 ? "+" : ""}
                      {fmtRate(margin)}/h
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {hpd} ч/д
                    </td>
                    <td className="p-3 text-right text-good">
                      ${Math.round(revMonth).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded border ${
                          inactive
                            ? "border-muted-foreground/30 text-muted-foreground"
                            : "border-good/40 text-good bg-good/10"
                        }`}
                      >
                        {inactive ? "завершён" : "активен"}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  cls,
}: {
  label: string;
  value: string;
  cls: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className={`font-display text-2xl leading-none ${cls}`}>{value}</div>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "good" | "bad" | "info";
  children: React.ReactNode;
}) {
  const cls =
    tone === "good"
      ? "border-good/40 text-good bg-good/10"
      : tone === "bad"
      ? "border-bad/40 text-bad bg-bad/10"
      : "border-info/40 text-info bg-info/10";
  return (
    <span
      className={`text-[9px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded border ${cls}`}
    >
      {children}
    </span>
  );
}
