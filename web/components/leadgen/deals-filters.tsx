"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MONTHS } from "@/lib/months";

export function DealsFilters({
  leadgenOptions,
  yearOptions,
  monthOptions,
}: {
  leadgenOptions: string[];
  yearOptions: number[];
  monthOptions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const type = params.get("type") ?? "sql";
  const lg = params.get("lg") ?? "all";
  const yr = params.get("yr") ?? "all";
  const mo = params.get("mo") ?? "all";

  function setParam(k: string, v: string | null) {
    const next = new URLSearchParams(params);
    if (v == null || v === "") next.delete(k);
    else next.set(k, v);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className="space-y-3 mb-5">
      {/* deal_type tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(["sql", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setParam("type", t)}
            disabled={pending}
            className={`px-3 py-1.5 rounded border font-mono text-[10px] uppercase tracking-[0.15em] transition ${
              type === t
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            {t === "sql" ? "SQL" : "Closed"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Leadgen">
          <select
            value={lg}
            onChange={(e) => setParam("lg", e.target.value === "all" ? null : e.target.value)}
            className="h-9 px-2 rounded border bg-background text-sm font-mono"
          >
            <option value="all">Все</option>
            {leadgenOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Год">
          <div className="flex gap-1">
            <Btn active={yr === "all"} onClick={() => setParam("yr", null)}>
              Все
            </Btn>
            {yearOptions.map((y) => (
              <Btn
                key={y}
                active={yr === String(y)}
                onClick={() => setParam("yr", String(y))}
              >
                {y}
              </Btn>
            ))}
          </div>
        </Field>

        <Field label="Месяц">
          <div className="flex flex-wrap gap-1">
            <Btn active={mo === "all"} onClick={() => setParam("mo", null)}>
              Все
            </Btn>
            {(monthOptions.length > 0 ? monthOptions : MONTHS).map((m) => (
              <Btn
                key={m}
                active={mo === m}
                onClick={() => setParam("mo", m)}
              >
                {m.slice(0, 3)}
              </Btn>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Btn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-7 px-2.5 rounded border font-mono text-[10px] uppercase tracking-[0.1em] transition ${
        active
          ? "border-primary text-primary bg-primary/10"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}
