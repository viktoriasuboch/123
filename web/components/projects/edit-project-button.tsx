"use client";

import { useState } from "react";
import type { Project } from "@/lib/schemas";
import { reportActionError } from "@/lib/client-errors";
import { updateProject } from "../../app/(protected)/projects/_actions";
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
import { Textarea } from "@/components/ui/textarea";

export function EditProjectButton({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          />
        }
      >
        ✏️ Редактировать
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Редактировать проект
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              await updateProject(project.id, fd);
              setOpen(false);
            } catch (err) {
              reportActionError(err, "Не сохранилось");
            }
          }}
          className="space-y-4"
        >
          <Field
            name="name"
            label="Название"
            defaultValue={project.name}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              name="start_date"
              label="Старт"
              type="date"
              defaultValue={project.start_date ?? ""}
            />
            <Field
              name="expected_duration"
              label="Длительность"
              defaultValue={project.expected_duration ?? ""}
              placeholder="3 мес."
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
              rows={3}
              defaultValue={project.notes ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="payment_terms"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Payment terms
            </Label>
            <Textarea
              id="payment_terms"
              name="payment_terms"
              rows={3}
              defaultValue={project.payment_terms ?? ""}
              placeholder="Net 30, invoice ежемесячно, ..."
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="manager_emails"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Контакты / Emails
            </Label>
            <Textarea
              id="manager_emails"
              name="manager_emails"
              rows={3}
              defaultValue={project.manager_emails ?? ""}
              placeholder={"Ivan Ivanov <ivan@company.com>\nAnna PM <anna@company.com>"}
            />
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
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
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
      />
    </div>
  );
}
