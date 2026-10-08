"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const backKey = (scope: string) => `interexy:back:${scope}`;

/**
 * Remembers the current list URL (tab + filters) per section, so a detail
 * page's "back" returns exactly here — the Завершённые tab, a dev filter —
 * instead of the section root.
 */
export function RememberListUrl({ scope }: { scope: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const qs = search.toString();
    try {
      sessionStorage.setItem(backKey(scope), qs ? `${pathname}?${qs}` : pathname);
    } catch {
      return;
    }
  }, [scope, pathname, search]);
  return null;
}
