"use client";

import { useTransition } from "react";
import type { Project } from "@/lib/schemas";
import { renameProject, deleteProject } from "../../app/(protected)/projects/_actions";
import { fmtDate } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  active: "Активный",
  completed: "Завершён",
  paused: "Пауза",
};

export function ProjectHeader({ project }: { project: Project }) {
  const [pending, start] = useTransition();
  const status = project.status ?? "active";

  return (
    <div className="flex items-start justify-between gap-6 mb-6 flex-wrap">
      <div className="flex-1 min-w-[240px]">
        <h1
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onBlur={(e) => {
            const next = e.currentTarget.innerText.trim();
            if (!next || next === project.name) return;
            start(async () => {
              try {
                await renameProject(project.id, next);
              } catch (err) {
                toast.error(`Не сохранилось: ${(err as Error).message}`);
              }
            });
          }}
          className="font-display text-4xl tracking-widest text-primary outline-none border-b-2 border-transparent focus:border-primary transition leading-none"
        >
          {project.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 items-center font-mono text-[10px] text-muted-foreground">
          <span
            className={`px-2 py-0.5 rounded border text-[9px] uppercase tracking-[0.15em] ${
              status === "active"
                ? "border-good/40 text-good bg-good/10"
                : status === "paused"
                ? "border-warn/40 text-warn bg-warn/10"
                : "border-muted-foreground/40 text-muted-foreground bg-muted/30"
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
          <span>
            Старт: <b className="text-foreground">{fmtDate(project.start_date)}</b>
          </span>
          {project.expected_duration ? (
            <span>
              Длительность:{" "}
              <b className="text-foreground">{project.expected_duration}</b>
            </span>
          ) : null}
        </div>
        {project.notes ? (
          <p className="mt-3 text-sm italic text-muted-foreground">
            {project.notes}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 items-start">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!confirm(`Удалить проект "${project.name}"? Откатить будет нельзя.`))
              return;
            start(async () => {
              try {
                await deleteProject(project.id);
              } catch (err) {
                toast.error(`Не удалилось: ${(err as Error).message}`);
              }
            });
          }}
          className="font-mono text-[10px] uppercase tracking-[0.15em] border-bad/40 text-bad hover:bg-bad/10 hover:border-bad"
          disabled={pending}
        >
          🗑 Удалить
        </Button>
      </div>
    </div>
  );
}
