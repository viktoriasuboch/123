"use client";

import { toast } from "sonner";
import { isRedirectError, isStaleServerActionError } from "./errors";

export { isRedirectError, isStaleServerActionError };

let reloadScheduled = false;

/**
 * Standard handler for try/catch around a Server Action call from a
 * client component. Pass the raw error and a Russian prefix
 * ("Не сохранилось", "Не удалилось", "Не получилось") and it does the
 * right thing:
 *
 *   - Re-throws redirect / notFound errors so Next.js can navigate.
 *   - On a stale-action mismatch (deploy left the client behind),
 *     warns the user and reloads the page once.
 *   - Otherwise shows toast.error("<prefix>: <message>").
 *
 * Usage:
 *   try { await someAction(); }
 *   catch (e) { reportActionError(e, "Не сохранилось"); }
 */
export function reportActionError(err: unknown, prefix: string): void {
  if (isRedirectError(err)) throw err;

  if (isStaleServerActionError(err)) {
    if (!reloadScheduled) {
      reloadScheduled = true;
      toast.warning("Версия страницы устарела — обновляю…");
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 600);
    }
    return;
  }

  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "неизвестная ошибка";
  toast.error(`${prefix}: ${message}`);
}
