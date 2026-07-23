"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { reportActionError } from "@/lib/client-errors";
import {
  createDocumentReminder,
  updateDocumentReminder,
} from "@/app/(protected)/invoices/_actions";
import type { DocumentReminder } from "@/lib/schemas";

type ProjectLite = { id: string; name: string };

export function DocumentReminderDialog({
  projects,
  reminder,
  trigger,
}: {
  projects: ProjectLite[];
  reminder?: DocumentReminder;
  trigger: React.ReactNode;
}) {
  const isEdit = !!reminder;
  const [open, setOpen] = useState(false);

  const initialProjectId = reminder?.project_id ?? "";
  const [projectId, setProjectId] = useState<string>(initialProjectId);
  const [search, setSearch] = useState<string>(
    projects.find((p) => p.id === initialProjectId)?.name ?? "",
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            {isEdit ? "Редактировать Credit Note" : "Новый Credit Note"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              if (!isEdit && !projectId) {
                reportActionError(
                  new Error("Выбери проект из списка"),
                  "Не сохранилось",
                );
                return;
              }
              fd.set("project_id", projectId);
              if (isEdit && reminder) {
                await updateDocumentReminder(reminder.id, fd);
              } else {
                await createDocumentReminder(fd);
              }
              setOpen(false);
            } catch (err) {
              reportActionError(err, "Не сохранилось");
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Проект *
            </Label>
            {isEdit ? (
              <div className="font-display text-lg leading-tight">
                {projects.find((p) => p.id === projectId)?.name ?? "—"}
              </div>
            ) : (
              <>
                <Input
                  list="creditnote-project-search"
                  value={search}
                  autoComplete="off"
                  placeholder="Начни печатать проект…"
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearch(v);
                    setProjectId(projects.find((p) => p.name === v)?.id ?? "");
                  }}
                />
                <datalist id="creditnote-project-search">
                  {projects.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                {search && !projectId ? (
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
                    выбери проект из списка
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Что ждём *
            </Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={reminder?.name ?? ""}
              placeholder="Credit note от HAYS"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="expected_day"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                К какому числу *
              </Label>
              <Input
                id="expected_day"
                name="expected_day"
                type="number"
                min="1"
                max="28"
                required
                defaultValue={reminder?.expected_day?.toString() ?? "10"}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="recurring"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                Повторяется
              </Label>
              <select
                id="recurring"
                name="recurring"
                defaultValue={reminder?.recurring === false ? "false" : "true"}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm dark:bg-input/30"
              >
                <option value="true">Каждый месяц</option>
                <option value="false">Разово</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Описание
            </Label>
            <Input
              id="description"
              name="description"
              defaultValue={reminder?.description ?? ""}
              placeholder="Например: с фактическими часами"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="notes"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Заметки
            </Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={reminder?.notes ?? ""}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">{isEdit ? "Сохранить" : "Создать"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
