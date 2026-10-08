"use client";

import { useState, useTransition } from "react";
import {
  CompletionReason,
  COMPLETION_REASON_LABEL,
  type CompletionReasonValue,
  type Project,
} from "@/lib/schemas";
import { reportActionError } from "@/lib/client-errors";
import {
  completeProject,
  updateCompletion,
} from "../../app/(protected)/projects/_actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const REASONS = CompletionReason.options;

/**
 * One dialog for both moments: completing a live project (sets the
 * status and the reason together, so no project ends without one) and
 * editing the reason on an already-completed project (backfill).
 */
export function CompleteProjectDialog({
  project,
  mode,
  triggerLabel,
  triggerClassName,
}: {
  project: Project;
  mode: "complete" | "edit";
  triggerLabel: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const [reason, setReason] = useState<CompletionReasonValue | "">(
    project.completion_reason ?? "",
  );
  const [note, setNote] = useState(project.completion_note ?? "");
  const [date, setDate] = useState(project.completed_at ?? today);

  const canSubmit = !!reason && /^\d{4}-\d{2}-\d{2}$/.test(date) && !pending;

  const submit = () => {
    if (!reason || !canSubmit) return;
    start(async () => {
      try {
        const input = { reason, note, completedAt: date };
        if (mode === "complete") {
          await completeProject(project.id, input);
          toast.success("Проект завершён");
        } else {
          await updateCompletion(project.id, input);
          toast.success("Причина сохранена");
        }
        setOpen(false);
      } catch (err) {
        reportActionError(err, "Не сохранилось");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setReason(project.completion_reason ?? "");
          setNote(project.completion_note ?? "");
          setDate(project.completed_at ?? today);
        }
        setOpen(v);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className={triggerClassName} />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            {mode === "complete" ? "Завершить проект" : "Причина завершения"}
          </DialogTitle>
        </DialogHeader>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground -mt-2 truncate">
          {project.name}
        </p>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Почему проект завершился *
            </Label>
            <div className="grid gap-1.5">
              {REASONS.map((r) => {
                const active = r === reason;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    aria-pressed={active}
                    className={`text-left px-3 py-2 rounded border text-sm transition ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    }`}
                  >
                    {COMPLETION_REASON_LABEL[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="completion_note"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Комментарий своими словами
            </Label>
            <textarea
              id="completion_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Что именно произошло, чтобы потом вспомнить…"
              className="w-full rounded border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary transition resize-y"
            />
          </div>

          <div className="space-y-1.5 max-w-[220px]">
            <Label
              htmlFor="completed_at"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Дата завершения *
            </Label>
            <Input
              id="completed_at"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              По ней проект попадёт в статистику за месяц / квартал
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Отмена
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {pending
              ? "Сохраняю…"
              : mode === "complete"
                ? "Завершить проект"
                : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
