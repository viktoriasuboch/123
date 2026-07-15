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
  createInvoice,
  updateInvoice,
} from "@/app/(protected)/invoices/_actions";
import type { Invoice } from "@/lib/schemas";
import type { ProjectOption } from "./invoice-template-dialog";

/**
 * Create a one-off invoice (not tied to a template) or edit an existing
 * one. In the edit dialog project can't be changed.
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
  /** When set, opens with this project preselected (used by "Create from template" buttons). */
  defaultProjectId?: string;
}) {
  const isEdit = !!invoice;
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>(
    invoice?.project_id ?? defaultProjectId ?? projects[0]?.id ?? "",
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    invoice?.invoice_number ??
      projects.find((p) => p.id === (invoice?.project_id ?? defaultProjectId ?? projects[0]?.id))
        ?.next_invoice_number ??
      "",
  );

  const project = projects.find((p) => p.id === projectId);
  const planned = project?.planned_monthly;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            {isEdit ? "Редактировать инвойс" : "Новый инвойс"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              if (isEdit && invoice) {
                await updateInvoice(invoice.id, fd);
              } else {
                await createInvoice(fd);
              }
              setOpen(false);
            } catch (err) {
              reportActionError(err, "Не сохранился инвойс");
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
                // Refresh the number suggestion — each project has its
                // own counter, so switching Project A → Project B needs
                // a different INV-XXX. Only auto-swap when the field
                // still holds the previous project's suggestion
                // (i.e. the user hasn't typed a custom value).
                if (!isEdit) {
                  const prev = projects.find((p) => p.id === projectId)?.next_invoice_number;
                  const nextSuggestion = projects.find((p) => p.id === v)?.next_invoice_number ?? "";
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

          <Field
            name="client_name"
            label="Клиент *"
            required
            defaultValue={invoice?.client_name ?? ""}
            placeholder="HAYS PLC"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              name="amount"
              label="Сумма *"
              type="number"
              step="0.01"
              defaultValue={invoice?.amount?.toString() ?? planned?.toString() ?? ""}
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

          <div className="grid grid-cols-2 gap-3">
            <Field
              name="scheduled_date"
              label="Планируется выставить"
              type="date"
              defaultValue={invoice?.scheduled_date ?? ""}
            />
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
