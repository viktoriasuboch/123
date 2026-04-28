"use client";

import { useState, useTransition } from "react";
import type { ProjectEvent } from "@/lib/schemas";
import { addProjectNote, deleteProjectEvent } from "../../app/(protected)/projects/_actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ICONS: Record<string, string> = {
  note: "📝",
  rate_change: "💸",
  join: "✅",
  leave: "🚪",
  status_change: "🔄",
};

export function EventHistory({
  projectId,
  events,
}: {
  projectId: string;
  events: ProjectEvent[];
}) {
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  return (
    <section className="rounded-md border bg-card">
      <header className="p-4 border-b">
        <h2 className="font-display text-xl tracking-wide">История</h2>
      </header>

      <div className="p-4 border-b">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Добавить заметку…"
          rows={2}
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            disabled={pending || !draft.trim()}
            onClick={() => {
              const text = draft.trim();
              if (!text) return;
              start(async () => {
                try {
                  await addProjectNote(projectId, text);
                  setDraft("");
                } catch (e) {
                  toast.error(`Не сохранилось: ${(e as Error).message}`);
                }
              });
            }}
          >
            Сохранить
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-border max-h-[480px] overflow-y-auto">
        {events.length === 0 ? (
          <li className="p-6 text-center text-xs font-mono text-muted-foreground">
            История пуста
          </li>
        ) : (
          events.map((e) => (
            <li key={e.id} className="flex gap-3 p-3 items-start group">
              <span className="text-lg leading-none mt-0.5">
                {ICONS[e.event_type ?? "note"] ?? "•"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{e.description ?? "—"}</p>
                {e.comment ? (
                  <p className="text-xs italic text-muted-foreground mt-0.5">
                    "{e.comment}"
                  </p>
                ) : null}
                <p className="font-mono text-[10px] text-muted-foreground mt-1">
                  {e.created_at
                    ? new Date(e.created_at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!confirm("Удалить запись?")) return;
                  start(async () => {
                    try {
                      await deleteProjectEvent(projectId, e.id);
                    } catch (err) {
                      toast.error(`Не удалилось: ${(err as Error).message}`);
                    }
                  });
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-bad transition px-2"
                title="Удалить"
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
