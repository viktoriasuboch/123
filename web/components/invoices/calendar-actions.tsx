"use client";

import { useState } from "react";
import {
  markInvoiceTemplateDone,
  markDocumentReminderReceived,
} from "@/app/(protected)/invoices/_actions";
import { InvoiceDialog } from "./invoice-dialog";
import { useHideable } from "@/lib/use-hideable";
import type { InvoiceTemplate, DocumentReminder } from "@/lib/schemas";
import type { ProjectOption } from "./invoice-template-dialog";

/**
 * Todo-style actions rendered on a calendar issue event that came out
 * of a recurring template:
 *   + Создать  — open the invoice dialog with the project + amount +
 *                currency preselected. Marks the template done for
 *                the current month as a side effect of createInvoice.
 *   ✓ Готово   — just mark the template done for the current month,
 *                without creating an invoice. For the case when the
 *                user invoiced the client elsewhere and only wants to
 *                clear the calendar todo.
 */
export function CalendarIssueActions({
  template,
  projectOptions,
}: {
  template: InvoiceTemplate;
  projectOptions: ProjectOption[];
}) {
  const [open, setOpen] = useState(false);
  const { hidden, dismiss } = useHideable();
  if (hidden) return null;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:bg-primary/20 transition"
      >
        + Создать
      </button>
      <form
        action={() =>
          dismiss(
            () => markInvoiceTemplateDone(template.id),
            "Не сохранилось",
          )
        }
      >
        <button
          type="submit"
          className="rounded border border-good/40 bg-good/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-good hover:bg-good/20 transition"
          title="Отметить выставленным — исчезнет до следующего месяца"
        >
          ✓ Готово
        </button>
      </form>
      <InvoiceDialog
        projects={projectOptions}
        defaultProjectId={template.project_id}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

/**
 * "Received it" action for calendar `document` events. Same server
 * action as the today widget.
 */
export function CalendarDocumentAction({
  reminder,
}: {
  reminder: DocumentReminder;
}) {
  const { hidden, dismiss } = useHideable();
  if (hidden) return null;
  return (
    <form
      action={() =>
        dismiss(
          () => markDocumentReminderReceived(reminder.id),
          "Не сохранилось",
        )
      }
      className="shrink-0"
    >
      <button
        type="submit"
        className="rounded border border-good/40 bg-good/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-good hover:bg-good/20 transition"
      >
        ✓ Получен
      </button>
    </form>
  );
}
