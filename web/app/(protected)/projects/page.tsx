import {
  listProjects,
  listProjectMembers,
  listDevStatuses,
} from "@/lib/data/projects";
import { ProjectCard } from "@/components/projects/project-card";
import { DevCard, type DevCardEntry } from "@/components/projects/dev-card";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { DevsSummaryBar } from "@/components/projects/devs-summary-bar";
import { ProjectsSummaryBar } from "@/components/projects/projects-summary-bar";
import { NewProjectButton } from "@/components/projects/new-project-button";
import type { Project, ProjectMember } from "@/lib/schemas";

type SP = Promise<{ tab?: string; q?: string; view?: string }>;

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "active") as "active" | "inactive" | "devs";
  const q = (sp.q ?? "").trim().toLowerCase();
  const view = (sp.view === "grid" ? "grid" : "list") as "list" | "grid";

  const [projects, members, devStatuses] = await Promise.all([
    listProjects(),
    listProjectMembers(),
    listDevStatuses(),
  ]);

  const membersByProject = groupBy(members, (m) => m.project_id);
  const activeProjects = projects.filter(
    (p) => (p.status ?? "active") === "active",
  );
  const inactiveProjects = projects.filter(
    (p) => (p.status ?? "active") !== "active",
  );

  // Build dev entries
  const devEntries = buildDevEntries(projects, members, devStatuses);

  // Apply search
  const projMatch = (p: Project) =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    (p.notes ?? "").toLowerCase().includes(q);

  const devMatch = (d: DevCardEntry) =>
    !q ||
    d.name.toLowerCase().includes(q) ||
    d.rows.some((r) => (r.project?.name ?? "").toLowerCase().includes(q));

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-widest text-primary leading-none">
            PROJECTS
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Команда · Рейты · Маржа
          </p>
        </div>
        <NewProjectButton />
      </div>

      <ProjectsFilters
        activeCount={activeProjects.length}
        inactiveCount={inactiveProjects.length}
        devsCount={devEntries.length}
      />

      {tab === "devs" ? (
        <>
          <DevsSummaryBar projects={projects} members={members} />
          <DevsList entries={devEntries.filter(devMatch)} view={view} />
        </>
      ) : (
        (() => {
          const visible = (tab === "active" ? activeProjects : inactiveProjects).filter(
            projMatch,
          );
          return (
            <>
              <ProjectsSummaryBar
                projects={visible}
                membersByProject={membersByProject}
                label={tab === "active" ? "Активные" : "Завершённые"}
              />
              <ProjectsList
                projects={visible}
                membersByProject={membersByProject}
                view={view}
              />
            </>
          );
        })()
      )}
    </div>
  );
}

/* ─── helpers ───────────────────────────────────────────────────────── */

function ProjectsList({
  projects,
  membersByProject,
  view,
}: {
  projects: Project[];
  membersByProject: Map<string, ProjectMember[]>;
  view: "list" | "grid";
}) {
  if (projects.length === 0)
    return (
      <p className="font-mono text-xs text-muted-foreground py-12 text-center">
        Проекты не найдены
      </p>
    );
  const containerCls =
    view === "grid"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : "space-y-3";
  return (
    <div className={containerCls}>
      {projects.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          members={membersByProject.get(p.id) ?? []}
          compact={view === "grid"}
        />
      ))}
    </div>
  );
}

function DevsList({
  entries,
  view,
}: {
  entries: DevCardEntry[];
  view: "list" | "grid";
}) {
  if (entries.length === 0)
    return (
      <p className="font-mono text-xs text-muted-foreground py-12 text-center">
        Разработчики не найдены
      </p>
    );

  const staff = entries.filter((d) => d.empType === "staff" && !d.fired);
  const free = entries.filter((d) => d.empType !== "staff" && !d.fired);
  const fired = entries.filter((d) => d.fired);

  return (
    <div className="space-y-6">
      {staff.length > 0 ? (
        <Section title="Штатные" tone="info" count={staff.length} entries={staff} view={view} />
      ) : null}
      {free.length > 0 ? (
        <Section title="Фрилансеры" tone="warn" count={free.length} entries={free} view={view} />
      ) : null}
      {fired.length > 0 ? (
        <Section title="Уволенные" tone="bad" count={fired.length} entries={fired} view={view} />
      ) : null}
    </div>
  );
}

function Section({
  title,
  count,
  entries,
  tone,
  view,
}: {
  title: string;
  count: number;
  entries: DevCardEntry[];
  tone: "info" | "warn" | "bad";
  view: "list" | "grid";
}) {
  const toneClass =
    tone === "info"
      ? "text-info"
      : tone === "warn"
      ? "text-warn"
      : "text-bad";
  const containerCls =
    view === "list"
      ? "grid gap-3 lg:grid-cols-2"
      : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  return (
    <div>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
        {title}
        <span className={toneClass}>{count}</span>
      </h2>
      <div className={containerCls}>
        {entries.map((e) => (
          <DevCard key={e.name} entry={e} />
        ))}
      </div>
    </div>
  );
}

function buildDevEntries(
  projects: Project[],
  members: ProjectMember[],
  devStatuses: Awaited<ReturnType<typeof listDevStatuses>>,
): DevCardEntry[] {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const groupedByName = groupBy(members, (m) => m.dev_name);

  const entries: DevCardEntry[] = [];
  for (const [name, ms] of groupedByName) {
    const empType = ms[0]?.employment_type ?? "freelancer";
    const fired = devStatuses[name]?.status === "inactive";
    entries.push({
      name,
      empType,
      fired,
      rows: ms.map((m) => ({ member: m, project: projectsById.get(m.project_id) })),
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function groupBy<T, K>(arr: T[], key: (x: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
