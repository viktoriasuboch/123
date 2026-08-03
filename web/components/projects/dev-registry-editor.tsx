"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportActionError } from "@/lib/client-errors";
import { updateDeveloper } from "@/app/(protected)/projects/_actions";

/**
 * Edit the developer's registry baseline (developer_status): role, type,
 * base salary, default monthly hours, notes. Distinct from per-project
 * rates — this is the master record. Active/fired status is untouched
 * (that's the Fire button).
 */
export function DevRegistryEditor({
  devName,
  role,
  employmentType,
  salary,
  defaultHoursLoad,
  notes,
}: {
  devName: string;
  role: string | null;
  employmentType: "staff" | "freelancer";
  salary: number;
  defaultHoursLoad: number;
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const label = "text-xs uppercase tracking-widest text-muted-foreground";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:border-primary hover:text-primary transition"
      >
        ✎ Данные и ставка
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide">
              Профиль · {devName}
            </DialogTitle>
          </DialogHeader>
          <form
            action={async (fd) => {
              try {
                await updateDeveloper({
                  dev_name: devName,
                  role: (fd.get("role") as string)?.trim() || null,
                  employment_type:
                    (fd.get("employment_type") as string) === "freelancer"
                      ? "freelancer"
                      : "staff",
                  salary: Number(fd.get("salary") ?? 0),
                  default_hours_load: Number(fd.get("default_hours_load") ?? 160),
                  notes: (fd.get("notes") as string)?.trim() || null,
                });
                setOpen(false);
              } catch (e) {
                reportActionError(e, "Не сохранилось");
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="role" className={label}>
                Роль
              </Label>
              <Input
                id="role"
                name="role"
                defaultValue={role ?? ""}
                placeholder="Backend, QA…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="employment_type" className={label}>
                  Тип
                </Label>
                <select
                  id="employment_type"
                  name="employment_type"
                  defaultValue={employmentType}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm dark:bg-input/30"
                >
                  <option value="staff">Штатный</option>
                  <option value="freelancer">Фрилансер</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salary" className={label}>
                  Зарплата, $/мес
                </Label>
                <Input
                  id="salary"
                  name="salary"
                  type="number"
                  step="0.01"
                  defaultValue={salary.toString()}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="default_hours_load" className={label}>
                Часов/мес по умолчанию
              </Label>
              <Input
                id="default_hours_load"
                name="default_hours_load"
                type="number"
                defaultValue={defaultHoursLoad.toString()}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className={label}>
                Заметки
              </Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={notes ?? ""} />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
