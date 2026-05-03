"use client";

import { useTransition } from "react";
import { reportActionError } from "@/lib/client-errors";
import { deleteRevenue } from "../../app/(protected)/leadgen/_actions";
import { toast } from "sonner";

export function RevenueRowDelete({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm(`Удалить запись ${label}?`)) return;
        start(async () => {
          try {
            await deleteRevenue(id);
          } catch (e) {
            reportActionError(e, "Не удалилось");
          }
        });
      }}
      disabled={pending}
      className="text-muted-foreground hover:text-bad text-xs px-1"
      title={`Удалить ${label}`}
    >
      ✕
    </button>
  );
}
