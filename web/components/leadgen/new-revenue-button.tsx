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
import { MONTHS } from "@/lib/months";
import { createRevenue } from "../../app/(protected)/leadgen/_actions";
import { toast } from "sonner";

export function NewRevenueButton({ yearOptions }: { yearOptions: number[] }) {
  const [open, setOpen] = useState(false);
  const cy = yearOptions[yearOptions.length - 1] ?? new Date().getFullYear();
  const cm = MONTHS[new Date().getMonth()];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono text-[10px] uppercase tracking-[0.15em]" />
        }
      >
        + Ревеню
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Новое ревеню
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              await createRevenue(fd);
              setOpen(false);
            } catch (err) {
              toast.error(`Не сохранилось: ${(err as Error).message}`);
            }
          }}
          className="space-y-4"
        >
          <Field name="project_name" label="Проект" required />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Месяц
              </Label>
              <select
                name="month"
                defaultValue={cm}
                className="w-full h-10 px-3 rounded border bg-background text-sm font-mono"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Год
              </Label>
              <select
                name="year"
                defaultValue={cy}
                className="w-full h-10 px-3 rounded border bg-background text-sm font-mono"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Field name="amount" label="Сумма $" type="number" required />
          <Field name="note" label="Комментарий" />
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
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
