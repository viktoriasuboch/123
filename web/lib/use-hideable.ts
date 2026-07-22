"use client";

import { useState, useTransition } from "react";
import { reportActionError } from "@/lib/client-errors";

/**
 * Client hook for "clicked → hide the row now, run the mutation in
 * the background, rollback on error". Returns `hidden` for early
 * return, `pending` for spinner-ish states, and `dismiss(fn, prefix)`
 * to wrap a server action call.
 *
 * Why not `useOptimistic`: our list rows come in as server props, not
 * a client state we can dispatch on. Local `hidden` is enough — the
 * server component re-fetches on revalidatePath and the whole row
 * unmounts anyway; this hook just fills the perceptual gap between
 * click and revalidation.
 */
export function useHideable() {
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  const dismiss = (fn: () => Promise<void>, errorPrefix: string) => {
    setHidden(true);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setHidden(false);
        reportActionError(err, errorPrefix);
      }
    });
  };

  return { hidden, pending, dismiss };
}
