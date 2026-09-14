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
 * Record a payment. Two modes, decided by the invoice's own state:
 *
 *  - First payment (issued): the field is the amount that arrived, and it
 *    is stored as `paid_amount` directly.
 *  - Top-up (already partially paid): the field is the *additional* money
 *    that just arrived (a delta). We add it to what was already received
 *    and store the cumulative total, so "Дооплатить 600" on a 400/1000
 *    invoice closes it, instead of overwriting 400 with 600.
 *
 * `paid_amount` in the DB always means "total collected to date".
 */
export function MarkInvoicePaidDialog({
  invoice,
  triggerLabel = "Оплачен",
}: {
  invoice: Invoice;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  const alreadyPaid =
    invoice.status === "paid" && invoice.paid_amount != null
      ? invoice.paid_amount
      : 0;
  const isTopUp = alreadyPaid > 0 && alreadyPaid < invoice.amount;
  const remainingBefore = Math.max(0, invoice.amount - alreadyPaid);

  // Top-up field prefills with the outstanding balance (the common case:
  // the rest arrived). First-payment field prefills with the full total.
  const [amt, setAmt] = useState<string>(
    String(isTopUp ? remainingBefore : invoice.amount),
  );

  const entered = Number(amt);
  const valid = Number.isFinite(entered) && entered > 0;
  const round2 = (v: number) => Math.round(v * 100) / 100;
  // Cumulative total that will be written to paid_amount (delta + already
  // collected for a top-up; the entered amount itself for a first payment).
  const cumulative = valid ? (isTopUp ? round2(alreadyPaid + entered) : entered) : 0;
  const remainingAfter = valid ? Math.max(0, invoice.amount - cumulative) : 0;
  const full = valid && cumulative >= invoice.amount;
  const fmt = (v: number) =>
    v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const today = new Date().toISOString().slice(0, 10);

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
            {isTopUp ? "Дооплата" : "Отметить оплату"}
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
          {isTopUp ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Уже получено {invoice.currency} {fmt(alreadyPaid)} из{" "}
              {invoice.currency} {fmt(invoice.amount)}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label
              htmlFor="pay_field"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              {isTopUp
                ? `Доплата пришла (${invoice.currency})`
                : `Пришло (${invoice.currency})`}
            </Label>
            <Input
              id="pay_field"
              // In top-up mode this is a delta, so it must NOT be submitted
              // as paid_amount — the hidden field below carries the total.
              name={isTopUp ? undefined : "paid_amount"}
              type="number"
              step="0.01"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
            />
            {isTopUp ? (
              <input type="hidden" name="paid_amount" value={String(cumulative)} />
            ) : null}

            {isTopUp ? (
              valid && !full ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal-600 dark:text-teal-400">
                  Станет получено {invoice.currency} {fmt(cumulative)} · останется{" "}
                  {invoice.currency} {fmt(remainingAfter)}
                </p>
              ) : full ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-good">
                  Инвойс будет оплачен полностью
                </p>
              ) : null
            ) : valid && !full ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal-600 dark:text-teal-400">
                Частичная оплата · останется {invoice.currency}{" "}
                {fmt(remainingAfter)}
              </p>
            ) : full ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-good">
                Полная оплата
              </p>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Из {invoice.currency} {fmt(invoice.amount)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="paid_date"
              className="text-xs uppercase tracking-widest text-muted-foreground"
            >
              Дата оплаты
            </Label>
            <Input
              id="paid_date"
              name="paid_date"
              type="date"
              defaultValue={today}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              По умолчанию сегодня — поменяй, если деньги пришли в другой день
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!valid}>
              {isTopUp ? "Дооплатить" : "Отметить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
