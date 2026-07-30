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
import { markInvoicePaid } from "@/app/(protected)/invoices/_actions";
import type { Invoice } from "@/lib/schemas";

/**
 * Move an `issued` invoice into `paid`. One field — the amount that
 * arrived (prefilled with the invoice total, editable for partials).
 * paid_date is set to today by the server action; no date picker.
 */
export function MarkInvoicePaidDialog({
  invoice,
  triggerLabel = "Оплачен",
}: {
  invoice: Invoice;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  // Prefill with what's already been received for a partial (so you can
  // top it up), otherwise the full invoice amount.
  const initial =
    invoice.status === "paid" && invoice.paid_amount != null
      ? invoice.paid_amount
      : invoice.amount;
  const [amt, setAmt] = useState<string>(String(initial));

  const entered = Number(amt);
  const valid = Number.isFinite(entered) && entered > 0;
  const remaining = valid ? Math.max(0, invoice.amount - entered) : 0;
  const full = valid && entered >= invoice.amount;
  const fmt = (v: number) =>
    v.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded border border-good/40 bg-good/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-good hover:bg-good/20 transition"
          />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Отметить оплату
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            try {
              await markInvoicePaid(invoice.id, fd);
              setOpen(false);
            } catch (err) {
              reportActionError(err, "Не сохранилось");
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="paid_amount"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Пришло ({invoice.currency})
            </Label>
            <Input
              id="paid_amount"
              name="paid_amount"
              type="number"
              step="0.01"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Из {invoice.currency} {fmt(invoice.amount)} · дата оплаты — сегодня
            </p>
            {valid && !full ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal-600 dark:text-teal-400">
                Частичная оплата · останется {invoice.currency} {fmt(remaining)}
              </p>
            ) : full ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-good">
                Полная оплата
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit">Отметить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
