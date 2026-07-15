"use client";

import { Button } from "@/components/ui/button";
import { reportActionError } from "@/lib/client-errors";
import {
  deleteDocumentReminder,
  markDocumentReminderReceived,
  updateDocumentReminder,
} from "@/app/(protected)/invoices/_actions";
import { DocumentReminderDialog } from "./document-reminder-dialog";
import type { DocumentReminder } from "@/lib/schemas";

type ProjectLite = { id: string; name: string };

export function DocumentReminderRowActions({
  reminder,
  projects,
}: {
  reminder: DocumentReminder;
  projects: ProjectLite[];
}) {
  const active = reminder.active !== false;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <form
        action={async () => {
          try {
            await markDocumentReminderReceived(reminder.id);
          } catch (err) {
            reportActionError(err, "Не сохранилось");
          }
        }}
      >
        <button
          type="submit"
          className="rounded border border-good/40 bg-good/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-good hover:bg-good/20 transition"
        >
          ✓ Получен
        </button>
      </form>
      <form
        action={async () => {
          try {
            const fd = new FormData();
            fd.set("active", active ? "false" : "true");
            await updateDocumentReminder(reminder.id, fd);
          } catch (err) {
            reportActionError(err, "Не переключилось");
          }
        }}
      >
        <button
          type="submit"
          className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] transition ${
            active
              ? "border-border bg-muted text-muted-foreground hover:bg-muted/70"
              : "border-good/40 bg-good/10 text-good hover:bg-good/20"
          }`}
        >
          {active ? "Пауза" : "Возобновить"}
        </button>
      </form>
      <DocumentReminderDialog
        projects={projects}
        reminder={reminder}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            Edit
          </Button>
        }
      />
      <form
        action={async () => {
          if (!confirm("Удалить напоминалку?")) return;
          try {
            await deleteDocumentReminder(reminder.id);
          } catch (err) {
            reportActionError(err, "Не удалилось");
          }
        }}
      >
        <button
          type="submit"
          className="rounded border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-destructive hover:bg-destructive/20 transition"
        >
          Del
        </button>
      </form>
    </div>
  );
}
