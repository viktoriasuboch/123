import type { ProjectEvent } from "@/lib/schemas";

/**
 * Read-only change timeline for a developer, aggregated across their
 * projects: new project (join), rate changes, salary changes, status
 * changes. Events are already filtered to this developer by the caller.
 */
const ICONS: Record<string, string> = {
  note: "📝",
  rate_change: "💸",
  join: "✅",
  leave: "🚪",
  status_change: "🔄",
};

export function DevHistory({
  events,
  projectsById,
}: {
  events: ProjectEvent[];
  projectsById: ReadonlyMap<string, { name: string }>;
}) {
  return (
    <section className="rounded-md border bg-card">
      <header className="p-4 border-b">
        <h2 className="font-display text-xl tracking-wide">История изменений</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
          новый проект · изменение рейта · изменение зарплаты
        </p>
      </header>
      <ul className="divide-y divide-border max-h-[480px] overflow-y-auto">
        {events.length === 0 ? (
          <li className="p-6 text-center text-xs font-mono text-muted-foreground">
            Изменений пока нет
          </li>
        ) : (
          events.map((e) => (
            <li key={e.id} className="flex gap-3 p-3 items-start">
              <span className="text-lg leading-none mt-0.5">
                {ICONS[e.event_type ?? "note"] ?? "•"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug whitespace-pre-wrap">
                  {e.description ?? "—"}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">
                  {projectsById.get(e.project_id)?.name ?? "проект"}
                  {e.created_at
                    ? ` · ${new Date(e.created_at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
