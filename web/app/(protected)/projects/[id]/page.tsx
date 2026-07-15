import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProject,
  getProjectMembers,
  getProjectEvents,
  listProjectMembers,
  listDevStatuses,
} from "@/lib/data/projects";
import { ProjectHeader } from "@/components/projects/project-header";
import { KpiRow } from "@/components/projects/kpi-row";
import { MembersTable } from "@/components/projects/members-table";
import { EventHistory } from "@/components/projects/event-history";

function ProjectInfoCard({
  title,
  body,
  placeholder,
}: {
  title: string;
  body: string | null | undefined;
  placeholder: string;
}) {
  const hasBody = !!body && body.trim().length > 0;
  return (
    <section className="rounded-md border bg-card p-4">
      <h3 className="font-display text-lg tracking-wide text-foreground mb-2 leading-none">
        {title}
      </h3>
      {hasBody ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground">{placeholder}</p>
      )}
    </section>
  );
}

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [project, members, events, allMembers, devStatuses] = await Promise.all([
    getProject(id),
    getProjectMembers(id),
    getProjectEvents(id),
    listProjectMembers(),
    listDevStatuses(),
  ]);
  if (!project) notFound();

  // Union of every dev name we know about, so the autocomplete suggests
  // people from other projects and the developer registry as you type.
  const known = new Set<string>();
  for (const m of allMembers) known.add(m.dev_name);
  for (const name of Object.keys(devStatuses)) known.add(name);
  const knownDevNames = [...known].sort((a, b) => a.localeCompare(b, "ru"));

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

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <ProjectInfoCard
            title="📝 Notes"
            body={project.notes}
            placeholder="Заметок по проекту нет — можно добавить через «Редактировать»."
          />
          <ProjectInfoCard
            title="💳 Payment terms"
            body={project.payment_terms}
            placeholder="Условия оплаты не заданы — можно добавить через «Редактировать»."
          />
          <ProjectInfoCard
            title="📧 Контакты"
            body={project.manager_emails}
            placeholder="Emails менеджеров не указаны — можно добавить через «Редактировать»."
          />
        </div>
        <MembersTable
          projectId={project.id}
          members={members}
          projectStatus={project.status ?? "active"}
          knownDevNames={knownDevNames}
        />
        <EventHistory projectId={project.id} events={events} />
      </div>
    </div>
  );
}
