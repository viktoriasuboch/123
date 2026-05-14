"use client";

import { useEffect, useState } from "react";

const LS_KEY = "lb_money_visible";
const EVT = "lb-money-visibility";

/**
 * Tracks the "are $-values visible" toggle, shared across all
 * components that import this hook on the same page. Reads from
 * localStorage on mount and listens for the custom event + the
 * cross-tab `storage` event so toggling in one bar updates every
 * other money cell instantly.
 */
export function useMoneyVisibility() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setVisible(window.localStorage.getItem(LS_KEY) === "1");
      } catch {
        /* SSR / private mode — ignore */
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener(EVT, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(EVT, read);
    };
  }, []);
  const toggle = () => {
    setVisible((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(LS_KEY, next ? "1" : "0");
        window.dispatchEvent(new Event(EVT));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  return { visible, toggle };
}

export function MoneyValue({
  value,
  fallback = "$•••",
}: {
  value: string;
  fallback?: string;
}) {
  const { visible } = useMoneyVisibility();
  return <>{visible ? value : fallback}</>;
}

export function MoneyToggle({ className }: { className?: string }) {
  const { visible, toggle } = useMoneyVisibility();
  return (
    <button
      type="button"
      onClick={toggle}
      title={visible ? "Скрыть суммы" : "Показать суммы"}
      aria-label={visible ? "Скрыть суммы" : "Показать суммы"}
      aria-pressed={visible}
      className={
        className ??
        "inline-flex items-center justify-center size-8 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition"
      }
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 2.5l12 11" />
      <path d="M4 4.5C2.6 5.7 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1.2 0 2.2-.3 3.1-.8" />
      <path d="M6.6 4.1A6.6 6.6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8c-.4.8-1 1.6-1.7 2.3" />
      <path d="M9.4 9.4a2 2 0 0 1-2.8-2.8" />
    </svg>
  );
}
