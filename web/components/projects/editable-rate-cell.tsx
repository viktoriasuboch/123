"use client";

import { useState, useTransition } from "react";
import { patchMember } from "@/app/(protected)/projects/_actions";
import { reportActionError } from "@/lib/client-errors";

/**
 * Inline-editable numeric cell for a project_members rate/salary/hours
 * field. Saves on blur (or Enter) via `patchMember`, which also logs the
 * change to the project history. Reverts on error or a no-op edit.
 */
export function EditableRateCell({
  projectId,
  memberId,
  field,
  value,
  prefix,
  suffix,
}: {
  projectId: string;
  memberId: string;
  field: "salary" | "buy_rate" | "sell_rate" | "hours_load";
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const [val, setVal] = useState<string>(String(value ?? 0));
  const [pending, start] = useTransition();

  const save = () => {
    const num = Number(val);
    if (!Number.isFinite(num) || num === (value ?? 0)) {
      setVal(String(value ?? 0));
      return;
    }
    start(async () => {
      try {
        await patchMember(projectId, memberId, field, num);
      } catch (e) {
        reportActionError(e, "Не сохранилось");
        setVal(String(value ?? 0));
      }
    });
  };

  return (
    <span
      className={`inline-flex items-baseline justify-end gap-0.5 ${pending ? "opacity-50" : ""}`}
    >
      {prefix ? <span className="text-muted-foreground">{prefix}</span> : null}
      <input
        type="number"
        step="any"
        value={val}
        disabled={pending}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setVal(String(value ?? 0));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-16 bg-transparent text-right rounded border border-transparent hover:border-border focus:border-primary focus:bg-background px-1 py-0.5 outline-none tabular-nums"
      />
      {suffix ? (
        <span className="text-muted-foreground text-[10px]">{suffix}</span>
      ) : null}
    </span>
  );
}
