"use client";

import { useEffect, useState, useTransition } from "react";
import type { ProjectEvent } from "@/lib/schemas";
import { reportActionError } from "@/lib/client-errors";
import {
  addProjectNote,
  deleteProjectEvent,
  editProjectNote,
} from "../../app/(protected)/projects/_actions";
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
                  reportActionError(e, "Не сохранилось");
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
            <EventItem key={e.id} projectId={projectId} event={e} />
          ))
        )}
      </ul>
    </section>
  );
}

function EventItem({
  projectId,
  event,
}: {
  projectId: string;
  event: ProjectEvent;
}) {
  const isNote = (event.event_type ?? "note") === "note";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(event.description ?? "");
  const [pending, start] = useTransition();

  // Pull latest description in if revalidate brings a new one and we're
  // not currently editing.
  useEffect(() => {
    if (!editing) setDraft(event.description ?? "");
  }, [event.description, editing]);

  const cancel = () => {
    setDraft(event.description ?? "");
    setEditing(false);
  };

  const save = () => {
    const text = draft.trim();
    if (!text) {
      toast.error("Заметка не может быть пустой");
      return;
    }
    if (text === (event.description ?? "")) {
      setEditing(false);
      return;
    }
    start(async () => {
      try {
        await editProjectNote(projectId, event.id, text);
        setEditing(false);
      } catch (err) {
        reportActionError(err, "Не сохранилось");
      }
    });
  };

  return (
    <li className={`flex gap-3 p-3 items-start group ${pending ? "opacity-50" : ""}`}>
      <span className="text-lg leading-none mt-0.5">
        {ICONS[event.event_type ?? "note"] ?? "•"}
      </span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              rows={2}
              autoFocus
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
                  ev.preventDefault();
                  save();
                } else if (ev.key === "Escape") {
                  cancel();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={cancel}
                disabled={pending}
              >
                Отмена
              </Button>
              <Button size="sm" onClick={save} disabled={pending}>
                Сохранить
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-snug whitespace-pre-wrap">
              {event.description ?? "—"}
            </p>
            {event.comment ? (
              <p className="text-xs italic text-muted-foreground mt-0.5">
                "{event.comment}"
              </p>
            ) : null}
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              {event.created_at
                ? new Date(event.created_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </p>
          </>
        )}
      </div>

      {!editing ? (
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition">
          {isNote ? (
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-primary px-1.5"
              title="Редактировать заметку"
              aria-label="Редактировать"
            >
              ✏️
            </button>
          ) : null}
          <button
            onClick={() => {
              if (!confirm("Удалить запись?")) return;
              start(async () => {
                try {
                  await deleteProjectEvent(projectId, event.id);
                } catch (err) {
                  reportActionError(err, "Не удалилось");
                }
              });
            }}
            className="text-muted-foreground hover:text-bad px-1.5"
            title="Удалить"
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      ) : null}
    </li>
  );
}
