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
import { reportActionError } from "@/lib/client-errors";
import { markInvoiceIssued } from "@/app/(protected)/invoices/_actions";
import type { Invoice } from "@/lib/schemas";

const today = () => new Date().toISOString().slice(0, 10);

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Move a `to_issue` invoice into `issued`. User confirms amount,
 * chooses issue_date (defaults today) and due_date (defaults issue+14).
 */
export function MarkInvoiceIssuedDialog({
  invoice,
  paymentTermsDaysDefault = 14,
}: {
  invoice: Invoice;
  paymentTermsDaysDefault?: number;
}) {
  const [open, setOpen] = useState(false);
  const [issueDate, setIssueDate] = useState<string>(today());
  const [dueDate, setDueDate] = useState<string>(
    addDays(today(), paymentTermsDaysDefault),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition"
          />
        }
      >
        Выставить
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Выставить инвойс
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              await markInvoiceIssued(invoice.id, fd);
              setOpen(false);
            } catch (err) {
              reportActionError(err, "Не получилось выставить");
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="amount"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Финальная сумма *
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              required
              defaultValue={invoice.amount.toString()}
            />
            {invoice.planned_amount != null &&
              invoice.planned_amount !== invoice.amount && (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Планировалось: {invoice.currency}{" "}
                  {invoice.planned_amount.toLocaleString("en-US")}
                </p>
              )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="issue_date"
                className="text-xs uppercase tracking-widest text-muted-foreground"
              >
                Дата выставления
              </Label>
              <Input
                id="issue_date"
                name="issue_date"
                type="date"
                value={issueDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setIssueDate(v);
                  if (v) setDueDate(addDays(v, paymentTermsDaysDefault));
                }}
              />
            </div>
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
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="invoice_number"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Номер инвойса
            </Label>
            <Input
              id="invoice_number"
              name="invoice_number"
              defaultValue={invoice.invoice_number ?? ""}
              placeholder="INV-2026-001"
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
            <Button type="submit">Выставить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
