import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProject,
  getProjectMembers,
  getProjectEvents,
} from "@/lib/data/projects";
import { ProjectHeader } from "@/components/projects/project-header";
import { KpiRow } from "@/components/projects/kpi-row";
import { MembersTable } from "@/components/projects/members-table";
import { EventHistory } from "@/components/projects/event-history";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [project, members, events] = await Promise.all([
    getProject(id),
    getProjectMembers(id),
    getProjectEvents(id),
  ]);
  if (!project) notFound();

  return (
    <div>
      <Link
        href="/projects"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground inline-block mb-4"
      >
        ← все проекты
      </Link>

      <ProjectHeader project={project} />
      <KpiRow members={members} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MembersTable projectId={project.id} members={members} />
        <EventHistory projectId={project.id} events={events} />
      </div>
    </div>
  );
}
