"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** 🔔 in the Projects header — opens the admin recent-changes feed, which
 *  used to sit on the dashboard. `children` is the server-rendered feed. */
export function ChangesButton({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          />
        }
      >
        🔔 Изменения
        {count > 0 ? (
          <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">
            {count}
          </span>
        ) : null}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Недавние изменения
          </DialogTitle>
        </DialogHeader>
        <p className="-mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          кто · что · когда · последние {count}
        </p>
        <div className="-mx-1 max-h-[60vh] overflow-y-auto px-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
