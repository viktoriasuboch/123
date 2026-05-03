"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reportActionError } from "@/lib/client-errors";
import { setDevStatus } from "../../app/(protected)/projects/_actions";
import { toast } from "sonner";

export function DevFireButton({
  devName,
  fired,
}: {
  devName: string;
  fired: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        const next = fired ? "active" : "inactive";
        const verb = fired ? "восстановить" : "уволить";
        if (!confirm(`Точно ${verb} ${devName}?`)) return;
        start(async () => {
          try {
            await setDevStatus(devName, next);
          } catch (e) {
            reportActionError(e, "Не получилось");
          }
        });
      }}
      className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
        fired
          ? "border-good/40 text-good hover:bg-good/10"
          : "border-bad/40 text-bad hover:bg-bad/10 hover:border-bad"
      }`}
    >
      {fired ? "↶ восстановить" : "× уволить"}
    </Button>
  );
}
