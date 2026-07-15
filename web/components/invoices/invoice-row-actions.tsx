"use client";

import { Button } from "@/components/ui/button";
import { reportActionError } from "@/lib/client-errors";
import {
  cancelInvoice,
  deleteInvoice,
} from "@/app/(protected)/invoices/_actions";
import { InvoiceDialog } from "./invoice-dialog";
import { MarkInvoiceIssuedDialog } from "./mark-invoice-issued-dialog";
import { MarkInvoicePaidDialog } from "./mark-invoice-paid-dialog";
import type { Invoice } from "@/lib/schemas";
import type { ProjectOption } from "./invoice-template-dialog";
import { effectiveStatus } from "./invoice-status-badge";

/**
 * Row-level buttons: what's shown depends on the effective status.
 * to_issue → [Выставить] [Edit] [Cancel] [Delete]
 * issued  → [Оплачен]   [Edit] [Cancel]
 * paid    → [Edit]
 * cancelled/overdue    → [Edit] [Delete]
 */
export function InvoiceRowActions({
  invoice,
  projects,
}: {
  invoice: Invoice;
  projects: ProjectOption[];
}) {
  const status = effectiveStatus(invoice);
  const showIssued = status === "to_issue";
  const showPaid = status === "issued" || status === "overdue";
  const showCancel = status === "to_issue" || status === "issued" || status === "overdue";
  const showDelete = status === "to_issue" || status === "cancelled";

  return (
    <div className="flex items-center justify-end gap-1.5">
      {showIssued && <MarkInvoiceIssuedDialog invoice={invoice} />}
      {showPaid && <MarkInvoicePaidDialog invoice={invoice} />}
      <InvoiceDialog
        projects={projects}
        invoice={invoice}
        trigger={<GhostBtn>Edit</GhostBtn>}
      />
      {showCancel && (
        <form
          action={async () => {
            try {
              await cancelInvoice(invoice.id);
            } catch (err) {
              reportActionError(err, "Не отменилось");
            }
          }}
        >
          <GhostBtn type="submit">Cancel</GhostBtn>
        </form>
      )}
      {showDelete && (
        <form
          action={async () => {
            if (!confirm("Удалить инвойс безвозвратно?")) return;
            try {
              await deleteInvoice(invoice.id);
            } catch (err) {
              reportActionError(err, "Не удалилось");
            }
          }}
        >
          <button
            type="submit"
            className="rounded border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-destructive hover:bg-destructive/20 transition"
          >
            Del
          </button>
        </form>
      )}
    </div>
  );
}

function GhostBtn({
  children,
  type = "button",
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <Button
      type={type}
      variant="ghost"
      size="sm"
      className="h-6 px-2 font-mono text-[10px] uppercase tracking-[0.12em]"
    >
      {children}
    </Button>
  );
}
