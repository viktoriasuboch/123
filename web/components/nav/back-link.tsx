"use client";

import { useRouter } from "next/navigation";
import { backKey } from "./remember-list-url";

/** "← back" that returns to the list the user actually came from (as
 *  recorded by RememberListUrl), falling back to the section root. */
export function BackLink({
  scope,
  fallback,
  label,
  className = "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground inline-block mb-4",
}: {
  scope: string;
  fallback: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <a
      href={fallback}
      onClick={(e) => {
        e.preventDefault();
        let target = fallback;
        try {
          target = sessionStorage.getItem(backKey(scope)) ?? fallback;
        } catch {
          target = fallback;
        }
        router.push(target);
      }}
      className={className}
    >
      {label}
    </a>
  );
}
