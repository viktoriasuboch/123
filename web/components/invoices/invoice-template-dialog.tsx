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
  createInvoiceTemplate,
  updateInvoiceTemplate,
} from "@/app/(protected)/invoices/_actions";
import type { InvoiceTemplate } from "@/lib/schemas";

export type ProjectOption = {
  id: string;
  name: string;
  planned_monthly: number;
  /** Suggested next invoice number for this project (INV-XXX). */
  next_invoice_number: string;
};

/**
 * Create or edit a recurring invoice template. When `template` is
 * provided it's an edit; otherwise it's a create dialog.
 * `plannedByProject` gives the auto-suggested amount when the user
 * picks a project — pulled from `sum(sell_rate * hours_load)` over the
 * project's active members.
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
  /** Preselect a project when opening (used by Projects tab rows). */
  defaultProjectId?: string;
}) {
  const isEdit = !!template;
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>(
    template?.project_id ?? defaultProjectId ?? projects[0]?.id ?? "",
  );

  const planned = projects.find((p) => p.id === projectId)?.planned_monthly;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            {isEdit ? "Редактировать рекуррентный инвойс" : "Новый рекуррентный инвойс"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              if (isEdit && template) {
                await updateInvoiceTemplate(template.id, fd);
              } else {
                await createInvoiceTemplate(fd);
              }
              setOpen(false);
            } catch (err) {
              reportActionError(err, "Не сохранился шаблон");
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
              onChange={(e) => setProjectId(e.target.value)}
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
            {planned != null && planned > 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                ≈ ${planned.toLocaleString("en-US", { maximumFractionDigits: 0 })} / мес по команде
              </p>
            ) : null}
          </div>

          <Field
            name="client_name"
            label="Клиент (контрагент)"
            required
            defaultValue={template?.client_name ?? ""}
            placeholder="HAYS PLC"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              name="amount"
              label="Сумма *"
              type="number"
              step="0.01"
              defaultValue={template?.amount?.toString() ?? planned?.toString() ?? ""}
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
                defaultValue={template?.currency ?? "USD"}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm dark:bg-input/30"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="RUB">RUB</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="frequency"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                Частота
              </Label>
              <select
                id="frequency"
                name="frequency"
                defaultValue={template?.frequency ?? "monthly"}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm dark:bg-input/30"
              >
                <option value="monthly">Ежемесячно</option>
                <option value="quarterly">Раз в квартал</option>
                <option value="once">Разово</option>
              </select>
            </div>
            <Field
              name="issue_day"
              label="День мес."
              type="number"
              min="1"
              max="28"
              defaultValue={template?.issue_day?.toString() ?? ""}
              placeholder="25"
            />
            <Field
              name="payment_terms_days"
              label="Terms (дн)"
              type="number"
              min="0"
              defaultValue={template?.payment_terms_days?.toString() ?? "14"}
            />
          </div>

          <Field
            name="next_issue_date"
            label="Ближайшая дата выставления"
            type="date"
            defaultValue={template?.next_issue_date ?? ""}
          />

          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Описание строки
            </Label>
            <Input
              id="description"
              name="description"
              defaultValue={template?.description ?? ""}
              placeholder="Development services — monthly"
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
              defaultValue={template?.notes ?? ""}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit">{isEdit ? "Сохранить" : "Создать"}</Button>
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
  defaultValue,
  min,
  max,
  step,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
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
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
