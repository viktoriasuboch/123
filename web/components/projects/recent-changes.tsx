import type { ProjectEvent } from "@/lib/schemas";

/**
 * Admin-only feed of the latest changes across all projects — who changed
 * what, and when. The "who" is the actor email appended to each event
 * description by the projects actions. Read-only. `bare` renders just the
 * list, for embedding in the 🔔 dialog.
 */
const ICONS: Record<string, string> = {
  note: "📝",
  rate_change: "💸",
  join: "✅",
  leave: "🚪",
  status_change: "🔄",
};

export function RecentChanges({
  events,
  projectsById,
  bare = false,
}: {
  events: ProjectEvent[];
  projectsById: ReadonlyMap<string, { name: string }>;
  bare?: boolean;
}) {
  if (events.length === 0) {
    return bare ? (
      <p className="py-2 font-mono text-xs italic text-muted-foreground">
        Изменений пока нет.
      </p>
    ) : null;
  }

  const list = (
    <ul
      className={`divide-y divide-border/60 ${bare ? "" : "max-h-[320px] overflow-y-auto"}`}
    >
      {events.map((e) => (
        <li key={e.id} className="flex gap-2.5 p-2.5 items-start">
          <span className="text-base leading-none mt-0.5">
            {ICONS[e.event_type ?? "note"] ?? "•"}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm leading-snug whitespace-pre-wrap">
              {e.description ?? "—"}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
              {projectsById.get(e.project_id)?.name ?? "проект"}
              {e.created_at
                ? ` · ${new Date(e.created_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  if (bare) return list;

  return (
    <section className="rounded-md border bg-card mb-6">
      <header className="p-3 border-b flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg tracking-wide leading-none">
          Недавние изменения
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          кто · что · когда
        </span>
      </header>
      {list}
    </section>
  );
}
