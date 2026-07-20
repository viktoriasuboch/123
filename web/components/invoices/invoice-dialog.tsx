"use client";

import { useState, cloneElement, isValidElement } from "react";
import type { ReactElement } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { reportActionError } from "@/lib/client-errors";
import {
  createInvoice,
  createInvoiceTemplate,
  updateInvoice,
} from "@/app/(protected)/invoices/_actions";
import type { Invoice } from "@/lib/schemas";
import type { ProjectOption } from "./invoice-template-dialog";

type RecurringMode = "monthly" | "biweekly";

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Create-or-edit form for an invoice. In this workflow "creating" means
 * "I've just issued it" — the invoice lands as status='issued' with
 * concrete issue_date + due_date. There's no separate "to_issue" step.
 * Project == client, so we don't ask for a client_name — we auto-set
 * it to the project's name on submit.
 */
export function InvoiceDialog({
  projects,
  invoice,
  trigger,
  defaultProjectId,
}: {
  projects: ProjectOption[];
  invoice?: Invoice;
  trigger: React.ReactNode;
  defaultProjectId?: string;
}) {
  const isEdit = !!invoice;
  const [open, setOpen] = useState(false);
  const initialProjectId =
    invoice?.project_id ?? defaultProjectId ?? projects[0]?.id ?? "";
  const [projectId, setProjectId] = useState<string>(initialProjectId);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    invoice?.invoice_number ??
      projects.find((p) => p.id === initialProjectId)?.next_invoice_number ??
      "",
  );
  const [issueDate, setIssueDate] = useState<string>(
    invoice?.issue_date ?? today(),
  );
  const [dueDate, setDueDate] = useState<string>(
    invoice?.due_date ?? addDays(today(), 14),
  );
  const [makeRecurring, setMakeRecurring] = useState(false);
  const [recurringMode, setRecurringMode] = useState<RecurringMode>("monthly");

  const project = projects.find((p) => p.id === projectId);
  const planned = project?.planned_monthly;

  const openDialog = () => setOpen(true);

  return (
    <>
      {renderTriggerWithClick(trigger, openDialog)}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide">
              {isEdit
                ? "Редактировать инвойс"
                : makeRecurring
                  ? "Новый рекуррентный инвойс"
                  : "Новый инвойс"}
            </DialogTitle>
          </DialogHeader>
          <form
            action={async (fd) => {
              try {
                // Client is always the project name — synthesise it here.
                const projectName =
                  projects.find(
                    (p) => p.id === (fd.get("project_id") as string),
                  )?.name ?? "";
                fd.set("client_name", projectName);

                if (isEdit && invoice) {
                  await updateInvoice(invoice.id, fd);
                } else if (makeRecurring) {
                  // "Recurring" mode = we're setting up a reminder, NOT
                  // issuing an invoice today. Don't materialise a
                  // concrete `invoices` row — just the template.
                  // "Дата инвойса" becomes the start of the schedule.
                  await createInvoiceTemplate(
                    buildTemplateFormData(fd, recurringMode, projectName),
                  );
                } else {
                  fd.set("status", "issued");
                  await createInvoice(fd);
                }
                setOpen(false);
              } catch (err) {
                reportActionError(err, "Не сохранилось");
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="project_id"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                Проект *
              </Label>
              <select
                id="project_id"
                name="project_id"
                required
                value={projectId}
                onChange={(e) => {
                  const v = e.target.value;
                  setProjectId(v);
                  if (!isEdit) {
                    const prev = projects.find(
                      (p) => p.id === projectId,
                    )?.next_invoice_number;
                    const nextSuggestion =
                      projects.find((p) => p.id === v)?.next_invoice_number ??
                      "";
                    if (invoiceNumber === "" || invoiceNumber === prev) {
                      setInvoiceNumber(nextSuggestion);
                    }
                  }
                }}
                disabled={isEdit}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm dark:bg-input/30"
              >
                <option value="">— выбери —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {planned != null && planned > 0 && !isEdit ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  ≈ ${planned.toLocaleString("en-US", { maximumFractionDigits: 0 })} / мес по команде
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="amount"
                label="Сумма *"
                type="number"
                step="0.01"
                defaultValue={
                  invoice?.amount?.toString() ?? planned?.toString() ?? ""
                }
                required
              />
              <div className="space-y-1.5">
                <Label
                  htmlFor="currency"
                  className="text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Валюта
                </Label>
                <select
                  id="currency"
                  name="currency"
                  defaultValue={invoice?.currency ?? "USD"}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm dark:bg-input/30"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="RUB">RUB</option>
                </select>
              </div>
            </div>

            <div className={makeRecurring ? "" : "grid grid-cols-2 gap-3"}>
              <div className="space-y-1.5">
                <Label
                  htmlFor="issue_date"
                  className="text-xs uppercase tracking-widest text-muted-foreground"
                >
                  {makeRecurring ? "Первое выставление *" : "Дата инвойса *"}
                </Label>
                <Input
                  id="issue_date"
                  name="issue_date"
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIssueDate(v);
                    if (v && dueDate && issueDate) {
                      const oldDelta =
                        (new Date(dueDate).getTime() -
                          new Date(issueDate).getTime()) /
                        86400_000;
                      if (Math.abs(oldDelta - 14) < 0.5) {
                        setDueDate(addDays(v, 14));
                      }
                    }
                  }}
                />
                {makeRecurring ? (
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    С этой даты запустится напоминалка. Сам инвойс создадим когда выставишь.
                  </p>
                ) : null}
              </div>
              {!makeRecurring ? (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="due_date"
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Оплатить до *
                  </Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            {!makeRecurring ? (
              <div className="space-y-1.5">
                <Label
                  htmlFor="invoice_number"
                  className="text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Номер
                </Label>
                <Input
                  id="invoice_number"
                  name="invoice_number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-001"
                />
                {!isEdit && project ? (
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Следующий по проекту: {project.next_invoice_number}
                  </p>
                ) : null}
              </div>
            ) : null}

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
                defaultValue={invoice?.description ?? ""}
                placeholder="Development services — May 2026"
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
                defaultValue={invoice?.notes ?? ""}
              />
            </div>

            {!isEdit ? (
              <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makeRecurring}
                    onChange={(e) => setMakeRecurring(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em]">
                    🔁 Сделать рекуррентным
                  </span>
                </label>
                {makeRecurring ? (
                  <div className="space-y-2 pl-6">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurring_mode"
                        value="monthly"
                        checked={recurringMode === "monthly"}
                        onChange={() => setRecurringMode("monthly")}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Раз в месяц</span>{" "}
                        <span className="text-muted-foreground font-mono text-[10px]">
                          · день = число из «Дата инвойса»
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurring_mode"
                        value="biweekly"
                        checked={recurringMode === "biweekly"}
                        onChange={() => setRecurringMode("biweekly")}
                        className="mt-0.5 size-4 accent-primary"
                      />
                      <span className="text-sm">
                        <span className="font-medium">Раз в 2 недели</span>{" "}
                        <span className="text-muted-foreground font-mono text-[10px]">
                          · старт = «Дата инвойса»
                        </span>
                      </span>
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit">
                {isEdit
                  ? "Сохранить"
                  : makeRecurring
                    ? "Настроить рекуррент"
                    : "Создать инвойс"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Clone the trigger and attach an onClick that opens the dialog. Using
 * a plain wrapper here (instead of base-ui's DialogTrigger + render)
 * because `render` on a compound React element didn't reliably wire
 * onClick, and the Edit button in row-actions kept ignoring clicks.
 */
function renderTriggerWithClick(trigger: React.ReactNode, onClick: () => void) {
  if (!isValidElement(trigger)) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick();
        }}
      >
        {trigger}
      </span>
    );
  }
  const el = trigger as ReactElement<Record<string, unknown>>;
  return cloneElement(el, {
    onClick: (event: React.MouseEvent) => {
      const prior = el.props.onClick as
        | ((e: React.MouseEvent) => void)
        | undefined;
      prior?.(event);
      onClick();
    },
  });
}

/**
 * Copy the fields that a recurring template shares with the just-created
 * one-off invoice, then add the recurrence-specific bits.
 */
function buildTemplateFormData(
  invoiceFd: FormData,
  mode: RecurringMode,
  projectName: string,
): FormData {
  const anchor =
    (invoiceFd.get("issue_date") as string | null) ||
    new Date().toISOString().slice(0, 10);
  const anchorDate = new Date(anchor + "T00:00:00");
  const dayOfMonth = anchorDate.getDate();

  const fd = new FormData();
  fd.set("project_id", (invoiceFd.get("project_id") as string) ?? "");
  fd.set("client_name", projectName);
  fd.set("description", (invoiceFd.get("description") as string) ?? "");
  fd.set("amount", (invoiceFd.get("amount") as string) ?? "0");
  fd.set("currency", (invoiceFd.get("currency") as string) ?? "USD");
  fd.set("payment_terms_days", "14");
  fd.set("active", "true");
  fd.set("notes", "Создан из формы «Новый инвойс»");
  if (mode === "monthly") {
    fd.set("frequency", "monthly");
    fd.set("issue_day", String(Math.min(dayOfMonth, 28)));
  } else {
    fd.set("frequency", "biweekly");
    fd.set("next_issue_date", anchor);
  }
  return fd;
}

function Field({
  name,
  label,
  required,
  type = "text",
  placeholder,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
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
