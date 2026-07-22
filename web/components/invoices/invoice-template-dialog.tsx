"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportActionError } from "@/lib/client-errors";
import {
  createInvoiceTemplate,
  updateInvoiceTemplate,
  deleteInvoiceTemplate,
} from "@/app/(protected)/invoices/_actions";
import type { InvoiceTemplate } from "@/lib/schemas";

export type ProjectOption = {
  id: string;
  name: string;
  planned_monthly: number;
  /** Suggested next invoice number for this project (INV-XXX). */
  next_invoice_number: string;
};

type Freq = "monthly" | "biweekly";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The single recurring-schedule editor for a project. Reached only from
 * the project page ("⚙ Настроить напоминание"). Project == client, so
 * there's no client field; the amount is пример from Projects, not
 * entered here. Opens with the existing schedule prefilled when
 * `template` is passed (edit), otherwise creates a new one.
 *
 * Controlled `open`/`onOpenChange` is used instead of base-ui's
 * DialogTrigger `render` — the render path swallowed clicks on
 * compound buttons before (see invoice-dialog).
 */
export function InvoiceTemplateDialog({
  projects,
  template,
  trigger,
  defaultProjectId,
}: {
  projects: ProjectOption[];
  template?: InvoiceTemplate;
  trigger: React.ReactNode;
  defaultProjectId?: string;
}) {
  const isEdit = !!template;
  const [open, setOpen] = useState(false);

  const projectId = template?.project_id ?? defaultProjectId ?? projects[0]?.id ?? "";
  const project = projects.find((p) => p.id === projectId);
  const planned = project?.planned_monthly ?? 0;

  const [freq, setFreq] = useState<Freq>(
    template?.frequency === "biweekly" ? "biweekly" : "monthly",
  );
  const [issueDay, setIssueDay] = useState<string>(
    template?.issue_day?.toString() ?? "1",
  );
  const [anchor, setAnchor] = useState<string>(
    template?.next_issue_date ?? today(),
  );
  const [currency, setCurrency] = useState<string>(template?.currency ?? "USD");
  const [notes, setNotes] = useState<string>(template?.notes ?? "");
  const [active, setActive] = useState<boolean>(template?.active !== false);

  const submit = async (fd: FormData) => {
    try {
      fd.set("project_id", projectId);
      fd.set("client_name", project?.name ?? "");
      // Approx amount lives with the schedule so the DB NOT NULL is
      // satisfied; the real figure is entered when issuing.
      fd.set("amount", String(planned || 0));
      fd.set("currency", currency);
      fd.set("frequency", freq);
      // Explicitly write BOTH cadence fields so switching monthly↔biweekly
      // clears the one that no longer applies.
      fd.set("issue_day", freq === "monthly" ? issueDay : "");
      fd.set("next_issue_date", freq === "biweekly" ? anchor : "");
      fd.set("notes", notes);
      fd.set("active", active ? "true" : "false");

      if (isEdit && template) {
        await updateInvoiceTemplate(template.id, fd);
      } else {
        await createInvoiceTemplate(fd);
      }
      setOpen(false);
    } catch (err) {
      reportActionError(err, "Не сохранилось расписание");
    }
  };

  const remove = async () => {
    if (!template) return;
    if (!confirm("Удалить расписание выставления?")) return;
    try {
      await deleteInvoiceTemplate(template.id);
      setOpen(false);
    } catch (err) {
      reportActionError(err, "Не удалилось");
    }
  };

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="inline-flex"
      >
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide">
              {isEdit ? "Настройка выставления" : "Настроить выставление"}
            </DialogTitle>
          </DialogHeader>
          <form action={submit} className="space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Проект
              </div>
              <div className="font-display text-lg leading-tight">
                {project?.name ?? "—"}
              </div>
              {planned > 0 ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">
                  ≈ ${planned.toLocaleString("en-US", { maximumFractionDigits: 0 })} / мес по команде
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Периодичность
              </Label>
              <div className="flex gap-2">
                {(
                  [
                    { id: "monthly", label: "Каждый месяц" },
                    { id: "biweekly", label: "Каждые 2 недели" },
                  ] as { id: Freq; label: string }[]
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setFreq(o.id)}
                    className={`flex-1 rounded-md border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition ${
                      freq === o.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/60"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {freq === "monthly" ? (
              <div className="space-y-1.5">
                <Label
                  htmlFor="issue_day"
                  className="text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Число месяца (1–28)
                </Label>
                <Input
                  id="issue_day"
                  type="number"
                  min="1"
                  max="28"
                  value={issueDay}
                  onChange={(e) => setIssueDay(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label
                  htmlFor="anchor"
                  className="text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Применять с (первое выставление)
                </Label>
                <Input
                  id="anchor"
                  type="date"
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  required
                />
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Дальше — каждые 14 дней от этой даты.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="currency"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                Валюта
              </Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm dark:bg-input/30"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="RUB">RUB</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="notes"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                Заметки
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="напр. просить credit note заранее"
              />
            </div>

            {isEdit ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                  Активно {active ? "" : "· на паузе"}
                </span>
              </label>
            ) : null}

            <DialogFooter className="flex-wrap gap-2">
              {isEdit ? (
                <button
                  type="button"
                  onClick={remove}
                  className="mr-auto rounded border border-destructive/40 bg-destructive/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-destructive hover:bg-destructive/20 transition"
                >
                  Удалить расписание
                </button>
              ) : null}
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">{isEdit ? "Сохранить" : "Настроить"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
