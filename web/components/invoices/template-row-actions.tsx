"use client";

import { Button } from "@/components/ui/button";
import { reportActionError } from "@/lib/client-errors";
import {
  toggleInvoiceTemplateActive,
  deleteInvoiceTemplate,
} from "@/app/(protected)/invoices/_actions";
import {
  InvoiceTemplateDialog,
  type ProjectOption,
} from "./invoice-template-dialog";
import type { InvoiceTemplate } from "@/lib/schemas";

export function TemplateRowActions({
  template,
  projects,
}: {
  template: InvoiceTemplate;
  projects: ProjectOption[];
}) {
  const active = template.active !== false;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <form
        action={async () => {
          try {
            await toggleInvoiceTemplateActive(template.id, !active);
          } catch (err) {
            reportActionError(err, "Не переключилось");
          }
        }}
      >
        <button
          type="submit"
          className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] transition ${
            active
              ? "border-good/40 bg-good/10 text-good hover:bg-good/20"
              : "border-border bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {active ? "Активен" : "Пауза"}
        </button>
      </form>
      <InvoiceTemplateDialog
        projects={projects}
        template={template}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 font-mono text-[10px] uppercase tracking-[0.12em]"
          >
            Edit
          </Button>
        }
      />
      <form
        action={async () => {
          if (!confirm("Удалить шаблон? Уже созданные инвойсы останутся.")) return;
          try {
            await deleteInvoiceTemplate(template.id);
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
    </div>
  );
}
