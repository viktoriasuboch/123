"use client";

import { useTransition } from "react";
import type { Deal, ProjectRevenue } from "@/lib/schemas";
import { MONTHS } from "@/lib/months";
import { reportActionError } from "@/lib/client-errors";
import { patchDeal, deleteDeal } from "../../app/(protected)/leadgen/_actions";
import { toast } from "sonner";

export function DealsTable({
  groups,
  leadgenNames,
  yearOptions,
  revenueLookup,
}: {
  groups: Array<{ project: string; deals: Deal[]; total: number }>;
  leadgenNames: string[];
  yearOptions: number[];
  revenueLookup: Map<string, number>;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-md border bg-card p-6 text-center font-mono text-xs text-muted-foreground">
        Сделки не найдены
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <table className="w-full text-sm font-mono min-w-[920px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground border-b">
            <th className="text-left p-3 font-normal">Проект / Сделка</th>
            <th className="text-left p-3 font-normal">Leadgen</th>
            <th className="text-left p-3 font-normal">Месяц</th>
            <th className="text-left p-3 font-normal">Год</th>
            <th className="text-right p-3 font-normal">Бонус</th>
            <th className="text-left p-3 font-normal">Тип</th>
            <th className="text-right p-3 font-normal">Revenue</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((g, gi) => [
            <tr key={`g-${gi}`} className="bg-muted/40 border-b">
              <td colSpan={4} className="p-3">
                <span className="font-display text-base text-muted-foreground mr-2">
                  {gi + 1}.
                </span>
                <span className="font-display text-lg text-foreground">
                  {g.project}
                </span>
              </td>
              <td className="p-3 text-right font-display text-lg text-primary">
                ${g.total.toLocaleString("en-US")}
              </td>
              <td colSpan={3}></td>
            </tr>,
            ...g.deals.map((d, di) => (
              <DealRow
                key={d.id}
                deal={d}
                letter={String.fromCharCode(65 + di)}
                leadgenNames={leadgenNames}
                yearOptions={yearOptions}
                revenueLookup={revenueLookup}
              />
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}

function DealRow({
  deal: d,
  letter,
  leadgenNames,
  yearOptions,
  revenueLookup,
}: {
  deal: Deal;
  letter: string;
  leadgenNames: string[];
  yearOptions: number[];
  revenueLookup: Map<string, number>;
}) {
  const [pending, start] = useTransition();
  const save = (field: string, value: string | number | null) => {
    start(async () => {
      try {
        await patchDeal(d.id, field, value);
      } catch (e) {
        reportActionError(e, "Не сохранилось");
      }
    });
  };

  const inputCls =
    "w-full bg-transparent rounded px-1 py-0.5 hover:bg-muted/40 focus:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary";

  // Auto-fill revenue from project_revenues if same project+month+year
  const autoRevKey = `${d.project.toLowerCase()}|${d.month}|${d.year ?? 2026}`;
  const autoRev = revenueLookup.get(autoRevKey);
  const revenueDisplay =
    d.revenue ?? (autoRev !== undefined ? String(autoRev) : "");

  return (
    <tr
      className={`border-b border-border/50 hover:bg-muted/10 ${pending ? "opacity-50" : ""}`}
    >
      <td className="p-2 pl-6">
        <span className="font-mono text-muted-foreground/70 mr-2">└─</span>
        <span className="text-[10px] font-mono text-muted-foreground mr-2">
          {letter}
        </span>
        <input
          defaultValue={d.project}
          onBlur={(e) => save("project", e.target.value)}
          className={`${inputCls} inline-block max-w-[200px]`}
        />
      </td>
      <td className="p-2">
        <select
          defaultValue={d.leadgen ?? ""}
          onChange={(e) => save("leadgen", e.target.value || null)}
          className={inputCls}
        >
          <option value="">—</option>
          {leadgenNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <select
          defaultValue={d.month}
          onChange={(e) => save("month", e.target.value)}
          className={inputCls}
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <select
          defaultValue={d.year ?? 2026}
          onChange={(e) => save("year", Number(e.target.value))}
          className={inputCls}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <input
          type="number"
          defaultValue={d.bonus}
          onBlur={(e) => save("bonus", Number(e.target.value))}
          className={`${inputCls} text-right`}
        />
      </td>
      <td className="p-2">
        <select
          defaultValue={d.deal_type ?? "sql"}
          onChange={(e) => save("deal_type", e.target.value)}
          className={inputCls}
        >
          <option value="sql">SQL</option>
          <option value="closed">Closed</option>
        </select>
      </td>
      <td className="p-2 text-right">
        <input
          type="text"
          defaultValue={revenueDisplay}
          placeholder={autoRev !== undefined ? `$${autoRev}` : "—"}
          onBlur={(e) => save("revenue", e.target.value || null)}
          className={`${inputCls} text-right`}
        />
      </td>
      <td className="p-2 text-center">
        <button
          onClick={() => {
            if (!confirm(`Удалить сделку ${d.project}?`)) return;
            start(async () => {
              try {
                await deleteDeal(d.id);
              } catch (e) {
                reportActionError(e, "Не удалилось");
              }
            });
          }}
          className="text-muted-foreground hover:text-bad text-base px-2"
          title="Удалить"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
