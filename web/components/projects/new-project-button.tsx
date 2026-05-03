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
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "../../app/(protected)/projects/_actions";
import { isRedirectError } from "@/lib/errors";
import { toast } from "sonner";

export function NewProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono text-[10px] uppercase tracking-[0.15em]" />
        }
      >
        + Новый проект
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Новый проект
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              await createProject(fd);
              setOpen(false);
            } catch (err) {
              if (isRedirectError(err)) throw err;
              toast.error(`Не удалось создать: ${(err as Error).message}`);
            }
          }}
          className="space-y-4"
        >
          <Field name="name" label="Название" required />
          <Field name="start_date" label="Старт" type="date" />
          <Field name="expected_duration" label="Длительность" placeholder="3 мес." />
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs uppercase tracking-widest text-muted-foreground">
              Заметки
            </Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">Создать</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  name,
  label,
  required,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} />
    </div>
  );
}
