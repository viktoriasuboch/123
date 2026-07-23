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
export function MarkInvoicePaidDialog({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);

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
        Оплачен
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
              defaultValue={invoice.amount.toString()}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Дата оплаты — сегодня
            </p>
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
