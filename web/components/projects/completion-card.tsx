"use client";

import { COMPLETION_REASON_LABEL, type Project } from "@/lib/schemas";
import { fmtDate } from "@/lib/calc";
import { CompleteProjectDialog } from "./complete-project-dialog";

/** Shown on a completed project: the reason, when, and a free note — with
 *  an edit entry point so older projects can be filled in after the fact. */
export function CompletionCard({ project }: { project: Project }) {
  const reason = project.completion_reason ?? null;
  return (
    <section
      className={`rounded-md border bg-card p-4 ${reason ? "" : "border-warn/50"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <h3 className="font-display text-lg tracking-wide text-foreground leading-none">
          🏁 Завершение
        </h3>
        <CompleteProjectDialog
          project={project}
          mode="edit"
          triggerLabel={reason ? "✎ Изменить" : "Указать причину"}
          triggerClassName={`font-mono text-[10px] uppercase tracking-[0.15em] ${
            reason ? "" : "border-warn/60 text-warn hover:bg-warn/10 hover:border-warn"
          }`}
        />
      </div>
      {reason ? (
        <>
          <p className="text-sm font-semibold">
            {COMPLETION_REASON_LABEL[reason]}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
            {project.completed_at
              ? `Завершён ${fmtDate(project.completed_at)}`
              : "Дата завершения не указана"}
          </p>
          {project.completion_note ? (
            <p className="mt-2 text-sm italic text-muted-foreground whitespace-pre-wrap">
              {project.completion_note}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-warn">
          Причина завершения не указана — без неё проект не попадёт в
          статистику.
        </p>
      )}
    </section>
  );
}
