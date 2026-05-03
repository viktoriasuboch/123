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
import { reportActionError } from "@/lib/client-errors";
import { createDeal } from "../../app/(protected)/leadgen/_actions";
import { toast } from "sonner";

export function NewDealButton({
  leadgenNames,
  yearOptions,
  defaultType = "sql",
}: {
  leadgenNames: string[];
  yearOptions: number[];
  defaultType?: "sql" | "closed";
}) {
  const [open, setOpen] = useState(false);
  const currentYear = yearOptions[yearOptions.length - 1] ?? new Date().getFullYear();
  const currentMonth = MONTHS[new Date().getMonth()];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono text-[10px] uppercase tracking-[0.15em]" />
        }
      >
        + Новая сделка
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Новая сделка
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              await createDeal(fd);
              setOpen(false);
            } catch (err) {
              reportActionError(err, "Не создалось");
            }
          }}
          className="space-y-4"
        >
          <Field name="project" label="Проект" required />
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Leadgen
            </Label>
            <select
              name="leadgen"
              defaultValue=""
              className="w-full h-10 px-3 rounded border bg-background text-sm font-mono"
            >
              <option value="">—</option>
              {leadgenNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Месяц
              </Label>
              <select
                name="month"
                defaultValue={currentMonth}
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
                defaultValue={currentYear}
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
          <div className="grid grid-cols-2 gap-3">
            <Field name="bonus" label="Бонус $" type="number" required />
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Тип
              </Label>
              <select
                name="deal_type"
                defaultValue={defaultType}
                className="w-full h-10 px-3 rounded border bg-background text-sm font-mono"
              >
                <option value="sql">SQL</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <Field name="comment" label="Комментарий" />
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
