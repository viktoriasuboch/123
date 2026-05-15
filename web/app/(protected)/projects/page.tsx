import {
  listProjects,
  listProjectMembers,
  listDevStatuses,
} from "@/lib/data/projects";
import { listProjectRevenues } from "@/lib/data/leadgen";
import { ProjectCard } from "@/components/projects/project-card";
import { DevCard, type DevCardEntry } from "@/components/projects/dev-card";
import {
  ProjectsFilters,
  type DevFilterId,
  type ClientFilterId,
} from "@/components/projects/projects-filters";
import { DevsSummaryBar } from "@/components/projects/devs-summary-bar";
import { ProjectsSummaryBar } from "@/components/projects/projects-summary-bar";
import { NewProjectButton } from "@/components/projects/new-project-button";
import type { LoadEntry } from "@/components/projects/load-list";
import { ProjectsDashboard } from "@/components/projects/projects-dashboard";
import { ForecastTable } from "@/components/projects/forecast-table";
import { NewDeveloperButton } from "@/components/projects/new-developer-button";
import type { Project, ProjectMember } from "@/lib/schemas";

type SP = Promise<{
  tab?: string;
  q?: string;
  view?: string;
  dev?: string;
  client?: string;
}>;

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "active") as
    | "active"
    | "support"
    | "inactive"
    | "devs"
    | "dashboard"
    | "forecast";
  const q = (sp.q ?? "").trim().toLowerCase();
  const view = (sp.view === "grid" ? "grid" : "list") as "list" | "grid";
  const devFilter = (
    sp.dev && ["all", "staff", "freelancer", "fired"].includes(sp.dev)
      ? sp.dev
      : "all"
  ) as DevFilterId;
  const clientFilter = (
    sp.client && ["all", "hays"].includes(sp.client) ? sp.client : "all"
  ) as ClientFilterId;

  const [projects, members, devStatuses, revenues] = await Promise.all([
    listProjects(),
    listProjectMembers(),
    listDevStatuses(),
    listProjectRevenues(),
  ]);

  const membersByProject = groupBy(members, (m) => m.project_id);
  const activeProjects = projects.filter(
    (p) => (p.status ?? "active") === "active",
  );
  const supportProjects = projects.filter(
    (p) => (p.status ?? "active") === "support",
  );
  const inactiveProjects = projects.filter((p) => {
    const s = p.status ?? "active";
    return s !== "active" && s !== "support";
  });

  // HAYS detection — user marks them in the project name as "(HAYS)".
  // Match case-insensitive on the whole substring so "Hays", "hays",
  // "(HAYS)" all qualify.
  const isHays = (p: Project) => /hays/i.test(p.name);
  const clientByFilter: Record<ClientFilterId, number> = {
    all: activeProjects.length,
    hays: activeProjects.filter(isHays).length,
  };
  const activeProjectsFiltered =
    clientFilter === "hays" ? activeProjects.filter(isHays) : activeProjects;

  // Build dev entries
  const devEntries = buildDevEntries(projects, members, devStatuses);

  // loadEntries: still computed for the Dashboard's Utilization /
  // Alerts sections. TM members are filtered out inside
  // buildLoadEntries (their hours aren't predictable).
  const loadEntries = buildLoadEntries(
    [...activeProjects, ...supportProjects],
    members,
    devStatuses,
  );

  // Counts for dev sub-filter buttons (search-independent, no double-filtering)
  const devsByFilter: Record<DevFilterId, number> = {
    all: devEntries.filter((d) => !d.fired).length,
    staff: devEntries.filter((d) => !d.fired && d.empType === "staff").length,
    freelancer: devEntries.filter(
      (d) => !d.fired && d.empType !== "staff",
    ).length,
    fired: devEntries.filter((d) => d.fired).length,
  };

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
        supportCount={supportProjects.length}
        inactiveCount={inactiveProjects.length}
        devsCount={devEntries.filter((d) => !d.fired).length}
        devsByFilter={devsByFilter}
        clientByFilter={clientByFilter}
      />

      {tab === "forecast" ? (
        <ForecastTable
          activeProjects={activeProjects}
          membersByProject={membersByProject}
          revenues={revenues}
        />
      ) : tab === "dashboard" ? (
        <ProjectsDashboard
          activeProjects={activeProjects}
          supportProjects={supportProjects}
          members={members}
          devStatuses={devStatuses}
          loadEntries={loadEntries}
        />
      ) : tab === "devs" ? (
        <>
          <div className="flex items-center justify-end mb-3">
            <NewDeveloperButton />
          </div>
          <DevsSummaryBar
            projects={projects}
            members={members}
            devEntries={devEntries}
            filter={devFilter}
          />
          <DevsList
            entries={devEntries.filter(devMatch)}
            view={view}
            filter={devFilter}
          />
        </>
      ) : (
        (() => {
          const bucket =
            tab === "active"
              ? activeProjectsFiltered
              : tab === "support"
                ? supportProjects
                : inactiveProjects;
          const visible = bucket.filter(projMatch);
          const label =
            tab === "active"
              ? "Активные"
              : tab === "support"
                ? "Суппорт"
                : "Завершённые";
          return (
            <>
              <ProjectsSummaryBar
                projects={visible}
                membersByProject={membersByProject}
                label={label}
              />
              {tab === "support" ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground -mt-2 mb-3">
                  ≈ суммы и часы ориентировочные; TM-участники не идут в нагрузку
                </p>
              ) : null}
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
      ? "grid gap-4 grid-cols-1 lg:grid-cols-2"
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
  filter,
}: {
  entries: DevCardEntry[];
  view: "list" | "grid";
  filter: DevFilterId;
}) {
  // Apply employment-type / fired filter
  const visible = entries.filter((d) => {
    if (filter === "fired") return d.fired;
    if (d.fired) return false; // hide fired in non-"fired" filters
    if (filter === "staff") return d.empType === "staff";
    if (filter === "freelancer") return d.empType !== "staff";
    return true; // all
  });

  if (visible.length === 0)
    return (
      <p className="font-mono text-xs text-muted-foreground py-12 text-center">
        {filter === "fired"
          ? "Уволенных нет"
          : "Разработчики не найдены"}
      </p>
    );

  const containerCls =
    view === "list"
      ? "space-y-3"
      : "grid gap-3 grid-cols-1 lg:grid-cols-2";

  return (
    <div className={containerCls}>
      {visible.map((e) => (
        <DevCard key={e.name} entry={e} />
      ))}
    </div>
  );
}

/**
 * Build a load summary for every active staff member across active
 * AND support projects. TM (Time & Material) members are excluded
 * from hours / load — their schedule is unpredictable. Fixed
 * support-project hours count just like active hours.
 */
function buildLoadEntries(
  countedProjects: Project[],
  members: ProjectMember[],
  devStatuses: Awaited<ReturnType<typeof listDevStatuses>>,
): LoadEntry[] {
  const projectsById = new Map(countedProjects.map((p) => [p.id, p]));

  const byDev = new Map<string, ProjectMember[]>();
  for (const m of members) {
    if (m.employment_type !== "staff") continue;
    if (m.is_active === false) continue;
    if (!projectsById.has(m.project_id)) continue;
    if ((m.billing_mode ?? "fixed") === "tm") continue;
    const list = byDev.get(m.dev_name) ?? [];
    list.push(m);
    byDev.set(m.dev_name, list);
  }

  // Registry-only staff who aren't on any active project right now —
  // still count them, with 0 hours, so they appear on the bench list.
  for (const [name, status] of Object.entries(devStatuses)) {
    if (byDev.has(name)) continue;
    if (status.status === "inactive") continue;
    if ((status.employment_type ?? "staff") !== "staff") continue;
    byDev.set(name, []);
  }

  const entries: LoadEntry[] = [];
  for (const [name, ms] of byDev) {
    if (devStatuses[name]?.status === "inactive") continue;
    const monthHours = ms.reduce((s, m) => s + (m.hours_load ?? 0), 0);
    const hoursPerDay = monthHours / 20;
    entries.push({
      name,
      monthHours,
      hoursPerDay,
      projects: ms
        .map((m) => ({
          project: projectsById.get(m.project_id)!,
          monthHours: m.hours_load ?? 0,
          hoursPerDay: (m.hours_load ?? 0) / 20,
        }))
        .sort((a, b) => b.hoursPerDay - a.hoursPerDay),
    });
  }
  return entries;
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
  // Devs in the registry who currently aren't on any project — still
  // show them so we can track bench load even when they're idle.
  for (const [name, status] of Object.entries(devStatuses)) {
    if (groupedByName.has(name)) continue;
    entries.push({
      name,
      empType: (status.employment_type ?? "staff") as "staff" | "freelancer",
      fired: status.status === "inactive",
      rows: [],
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
