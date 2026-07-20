"use client";

import {
  markDocumentReminderReceived,
  markInvoiceTemplateDone,
} from "@/app/(protected)/invoices/_actions";
import { reportActionError } from "@/lib/client-errors";
import { fmtDate } from "@/lib/calc";
import type {
  Invoice,
  InvoiceTemplate,
  DocumentReminder,
} from "@/lib/schemas";
import type { ProjectOption } from "./invoice-template-dialog";
import { InvoiceDialog } from "./invoice-dialog";
import { MarkInvoicePaidDialog } from "./mark-invoice-paid-dialog";

type Project = { id: string; name: string };

export type TodayIssueItem = {
  kind: "template";
  template: InvoiceTemplate;
  daysUntil: number;
};

export type TodayOverdueItem = {
  kind: "overdue";
  invoice: Invoice;
  daysLate: number;
};

export type TodayDocumentItem = {
  kind: "document";
  reminder: DocumentReminder;
  daysLate: number;
};

export function TodayWidget({
  toIssue,
  overdue,
  documents,
  projects,
  projectOptions,
}: {
  toIssue: TodayIssueItem[];
  overdue: TodayOverdueItem[];
  documents: TodayDocumentItem[];
  projects: Map<string, Project>;
  projectOptions: ProjectOption[];
}) {
  const isEmpty =
    toIssue.length === 0 && overdue.length === 0 && documents.length === 0;
  if (isEmpty) {
    return (
      <div className="rounded-md border border-good/30 bg-good/5 p-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-good">
          <span>✓</span>
          <span>Ничего срочного на сегодня</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-4">
      <h2 className="font-display text-lg tracking-wide leading-none">
        🔔 К действию
      </h2>

      {toIssue.length > 0 ? (
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400 mb-2">
            К выставлению · {toIssue.length}
          </div>
          <ul className="space-y-1.5">
            {toIssue.map((it) => (
              <IssueRow
                key={it.template.id}
                item={it}
                project={projects.get(it.template.project_id)}
                projectOptions={projectOptions}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {overdue.length > 0 ? (
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-destructive mb-2">
            Просрочено · {overdue.length}
          </div>
          <ul className="space-y-1.5">
            {overdue.map((it) => (
              <OverdueRow
                key={it.invoice.id}
                item={it}
                project={projects.get(it.invoice.project_id)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {documents.length > 0 ? (
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-sky-600 dark:text-sky-400 mb-2">
            Ждём Credit Note HAYS · {documents.length}
          </div>
          <ul className="space-y-1.5">
            {documents.map((it) => (
              <DocumentRow
                key={it.reminder.id}
                item={it}
                project={projects.get(it.reminder.project_id)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function IssueRow({
  item,
  project,
  projectOptions,
}: {
  item: TodayIssueItem;
  project?: Project;
  projectOptions: ProjectOption[];
}) {
  const opt = projectOptions.find((p) => p.id === item.template.project_id);
  const suggested = opt?.next_invoice_number ?? "";
  const missed = item.daysUntil < 0;
  const when = missed
    ? `${-item.daysUntil} дн. назад`
    : item.daysUntil === 0
      ? "сегодня"
      : `через ${item.daysUntil} дн.`;
  return (
    <li
      className={`flex items-center justify-between gap-3 flex-wrap py-1 border-b border-border/30 last:border-b-0 ${
        missed ? "bg-destructive/5 -mx-1 px-1 rounded" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm flex items-center gap-1.5 flex-wrap">
          {missed ? (
            <span
              className="text-destructive text-base leading-none"
              aria-hidden
              title="Ты пропустила эту дату"
            >
              ❗
            </span>
          ) : null}
          <span className="font-mono text-muted-foreground">{suggested}</span>
          <span className="font-medium">{project?.name ?? "—"}</span>
          <span
            className={
              missed ? "text-destructive" : "text-muted-foreground"
            }
          >
            — выставить {when}
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {item.template.client_name} · {item.template.currency}{" "}
          {formatAmount(item.template.amount)}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <InvoiceDialog
          projects={projectOptions}
          defaultProjectId={item.template.project_id}
          trigger={
            <button
              type="button"
              className="rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:bg-primary/20 transition"
            >
              + Создать
            </button>
          }
        />
        <form
          action={async () => {
            try {
              await markInvoiceTemplateDone(item.template.id);
            } catch (err) {
              reportActionError(err, "Не сохранилось");
            }
          }}
        >
          <button
            type="submit"
            className="rounded border border-good/40 bg-good/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-good hover:bg-good/20 transition"
            title="Отметить как выполненную — исчезнет до следующего месяца"
          >
            ✓ Готово
          </button>
        </form>
      </div>
    </li>
  );
}

function OverdueRow({
  item,
  project,
}: {
  item: TodayOverdueItem;
  project?: Project;
}) {
  return (
    <li className="flex items-center justify-between gap-3 flex-wrap py-1 border-b border-border/30 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-mono text-muted-foreground">
            {item.invoice.invoice_number ?? "—"}
          </span>{" "}
          <span className="font-medium">
            {project?.name ?? "—"}
          </span>{" "}
          <span className="text-destructive">
            — просрочен на {item.daysLate} дн.
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {item.invoice.client_name} · {item.invoice.currency}{" "}
          {formatAmount(item.invoice.amount)} · due {fmtDate(item.invoice.due_date)}
        </div>
      </div>
      <MarkInvoicePaidDialog invoice={item.invoice} />
    </li>
  );
}

function DocumentRow({
  item,
  project,
}: {
  item: TodayDocumentItem;
  project?: Project;
}) {
  return (
    <li className="flex items-center justify-between gap-3 flex-wrap py-1 border-b border-border/30 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-medium">{item.reminder.name}</span>
          <span className="text-muted-foreground"> — </span>
          <span className="text-muted-foreground">{project?.name ?? "—"}</span>{" "}
          <span className="text-sky-600 dark:text-sky-400">
            {item.daysLate === 0
              ? "ждали к сегодня"
              : `просрочка ${item.daysLate} дн.`}
          </span>
        </div>
        {item.reminder.description ? (
          <div className="font-mono text-[10px] text-muted-foreground">
            {item.reminder.description}
          </div>
        ) : null}
      </div>
      <form
        action={async () => {
          try {
            await markDocumentReminderReceived(item.reminder.id);
          } catch (err) {
            reportActionError(err, "Не сохранилось");
          }
        }}
      >
        <button
          type="submit"
          className="rounded border border-good/40 bg-good/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-good hover:bg-good/20 transition"
        >
          ✓ Получен
        </button>
      </form>
    </li>
  );
}

function formatAmount(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
