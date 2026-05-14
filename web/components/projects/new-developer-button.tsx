"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportActionError } from "@/lib/client-errors";
import { createDeveloper } from "../../app/(protected)/projects/_actions";

export function NewDeveloperButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          />
        }
      >
        + Разработчик
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Новый разработчик
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Добавь в реестр сотрудника, даже если он сейчас не привязан
          ни к одному проекту. Он появится во вкладке «Разработчики» и
          в «Нагрузке» как бенч.
        </p>
        <form
          action={async (fd) => {
            try {
              await createDeveloper({
                dev_name: String(fd.get("dev_name") ?? ""),
                role: (fd.get("role") as string) || null,
                employment_type:
                  (fd.get("employment_type") as string) === "freelancer"
                    ? "freelancer"
                    : "staff",
                salary: Number(fd.get("salary") ?? 0),
                default_hours_load: Number(fd.get("default_hours_load") ?? 160),
              });
              setOpen(false);
            } catch (err) {
              reportActionError(err, "Не получилось");
            }
          }}
          className="space-y-4"
        >
          <Field name="dev_name" label="Имя" required />
          <div className="grid grid-cols-2 gap-3">
            <Field name="role" label="Роль" placeholder="Dev / QA / PM" />
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Тип
              </Label>
              <select
                name="employment_type"
                defaultValue="staff"
                className="w-full h-10 px-3 rounded border bg-background text-sm font-mono"
              >
                <option value="staff">Штатный</option>
                <option value="freelancer">Фрилансер</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field name="salary" label="Salary/мес" type="number" step="0.01" />
            <Field
              name="default_hours_load"
              label="Часов/мес"
              type="number"
              step="1"
              defaultValue="160"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">Добавить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={name}
        className="text-xs uppercase tracking-widest text-muted-foreground"
      >
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={step}
      />
    </div>
  );
}
