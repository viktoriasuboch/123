"use client";

import { useEffect, useState, useTransition } from "react";
import type { ProjectMember } from "@/lib/schemas";
import { HOURS_PER_MONTH, fmtRate } from "@/lib/calc";
import { reportActionError } from "@/lib/client-errors";
import { patchMember, removeMember, addMember, moveMember } from "../../app/(protected)/projects/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function MembersTable({
  projectId,
  members,
}: {
  projectId: string;
  members: ProjectMember[];
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <section className="rounded-md border bg-card overflow-x-auto">
      <header className="flex items-center justify-between p-4 border-b">
        <h2 className="font-display text-xl tracking-wide">Команда</h2>
        <Button
          size="sm"
          variant={showAdd ? "ghost" : "default"}
          onClick={() => setShowAdd((s) => !s)}
          className="font-mono text-[10px] uppercase tracking-[0.15em]"
        >
          {showAdd ? "× Отмена" : "+ Добавить"}
        </Button>
      </header>

      {showAdd ? (
        <AddMemberRow
          projectId={projectId}
          onDone={() => setShowAdd(false)}
        />
      ) : null}

      <table className="w-full text-sm font-mono min-w-[1230px] table-fixed">
        <colgroup>
          <col className="w-[44px]"  /> {/* ↕ move */}
          <col className="w-[170px]" /> {/* Имя */}
          <col className="w-[75px]"  /> {/* Роль */}
          <col className="w-[95px]"  /> {/* Тип */}
          <col className="w-[80px]"  /> {/* Зарплата */}
          <col className="w-[65px]"  /> {/* Buy */}
          <col className="w-[55px]"  /> {/* Sell */}
          <col className="w-[70px]"  /> {/* Маржа $ */}
          <col className="w-[60px]"  /> {/* Маржа % */}
          <col className="w-[80px]"  /> {/* Rev/мес */}
          <col className="w-[50px]"  /> {/* ч/день */}
          <col className="w-[130px]" /> {/* Старт */}
          <col className="w-[130px]" /> {/* Конец */}
          <col className="w-[95px]"  /> {/* Статус */}
          <col className="w-[60px]"  /> {/* actions: 🔗 ✕ */}
        </colgroup>
        <thead>
          <tr className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground border-b">
            <th className="p-2"></th>
            <th className="text-left p-2 font-normal">Имя</th>
            <th className="text-left p-2 font-normal">Роль</th>
            <th className="text-left p-2 font-normal">Тип</th>
            <th className="text-right p-2 font-normal">Зарплата</th>
            <th className="text-right p-2 font-normal">Buy</th>
            <th className="text-right p-2 font-normal">Sell</th>
            <th className="text-right p-2 font-normal">Маржа $</th>
            <th className="text-right p-2 font-normal">Маржа %</th>
            <th className="text-right p-2 font-normal">Rev/мес</th>
            <th className="text-right p-2 font-normal">ч/день</th>
            <th className="text-left p-2 font-normal">Старт</th>
            <th className="text-left p-2 font-normal">Конец</th>
            <th className="text-left p-2 font-normal">Статус</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {renderRows(members, projectId)}
          {members.length === 0 ? (
            <tr>
              <td
                colSpan={15}
                className="p-6 text-center text-muted-foreground text-xs"
              >
                Команда пуста
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

/**
 * Walk the (already sort_order-sorted) members list and render either
 * a singleton MemberRow or a Group block (summary + member rows) for
 * adjacent runs of members sharing a `group_label`.
 */
function renderRows(members: ProjectMember[], projectId: string) {
  type Slot =
    | { kind: "single"; member: ProjectMember; idx: number }
    | { kind: "group"; label: string; list: ProjectMember[]; firstIdx: number; lastIdx: number };

  const slots: Slot[] = [];
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const label = m.group_label?.trim() || null;
    const last = slots[slots.length - 1];
    if (label && last && last.kind === "group" && last.label === label) {
      last.list.push(m);
      last.lastIdx = i;
    } else if (label) {
      slots.push({ kind: "group", label, list: [m], firstIdx: i, lastIdx: i });
    } else {
      slots.push({ kind: "single", member: m, idx: i });
    }
  }

  const total = members.length;
  return slots.flatMap((slot) => {
    if (slot.kind === "single") {
      return [
        <MemberRow
          key={slot.member.id}
          m={slot.member}
          projectId={projectId}
          isFirst={slot.idx === 0}
          isLast={slot.idx === total - 1}
          inGroup={false}
        />,
      ];
    }
    return [
      <GroupSummaryRow
        key={`gs-${slot.label}-${slot.list[0].id}`}
        label={slot.label}
        list={slot.list}
        projectId={projectId}
      />,
      ...slot.list.map((m, j) => (
        <MemberRow
          key={m.id}
          m={m}
          projectId={projectId}
          isFirst={slot.firstIdx + j === 0}
          isLast={slot.firstIdx + j === total - 1}
          inGroup
          isLead={j === 0}
          letter={String.fromCharCode(65 + j)}
        />
      )),
    ];
  });
}

function GroupSummaryRow({
  label,
  list,
  projectId,
}: {
  label: string;
  list: ProjectMember[];
  projectId: string;
}) {
  const lead = list[0];
  const sumBuy = list.reduce((s, m) => {
    const b =
      m.employment_type === "staff"
        ? (m.salary || 0) / HOURS_PER_MONTH
        : m.buy_rate || 0;
    return s + b;
  }, 0);
  const sell = lead.sell_rate || 0;
  const hours = lead.hours_load || 0;
  const margin = sell - sumBuy;
  const marginPct = sell > 0 ? (margin / sell) * 100 : 0;
  const rev = sell * hours;
  const hpd = hours / 20;
  const cls = margin < 20 ? "text-bad" : "text-good";

  const [pending, start] = useTransition();

  const renameGroup = () => {
    const next = window.prompt(
      "Новое название группы (пусто — расформировать):",
      label,
    );
    if (next === null) return;
    const trimmed = next.trim();
    start(async () => {
      try {
        for (const m of list) {
          await patchMember(projectId, m.id, "group_label", trimmed || null);
        }
      } catch (e) {
        reportActionError(e, "Не сохранилось");
      }
    });
  };

  return (
    <tr
      className={`bg-primary/5 border-y border-primary/30 text-[11px] ${pending ? "opacity-50" : ""}`}
    >
      <td className="p-1.5 text-center text-primary">▾</td>
      <td
        className="p-1.5 font-display tracking-wide text-primary truncate"
        colSpan={2}
      >
        {label}
        <span className="ml-2 text-muted-foreground uppercase tracking-[0.15em] text-[9px] font-mono">
          · {list.length} чел
        </span>
      </td>
      <td className="p-1.5"></td>
      <td className="p-1.5"></td>
      <td className="p-1.5 text-right text-muted-foreground">{fmtRate(sumBuy)}</td>
      <td className="p-1.5 text-right text-muted-foreground">{fmtRate(sell)}</td>
      <td className={`p-1.5 text-right ${cls}`}>{fmtRate(margin)}</td>
      <td className={`p-1.5 text-right ${cls}`}>{marginPct.toFixed(1)}%</td>
      <td className="p-1.5 text-right text-muted-foreground">
        ${Math.round(rev).toLocaleString()}
      </td>
      <td className="p-1.5 text-right text-muted-foreground">
        {Math.round(hpd * 10) / 10}
      </td>
      <td className="p-1.5"></td>
      <td className="p-1.5"></td>
      <td className="p-1.5"></td>
      <td className="p-1.5 text-center">
        <button
          type="button"
          onClick={renameGroup}
          disabled={pending}
          className="text-muted-foreground hover:text-primary text-[12px] px-1"
          title="Переименовать или расформировать группу"
          aria-label="Изменить группу"
        >
          ✏️
        </button>
      </td>
    </tr>
  );
}

function MemberRow({
  m,
  projectId,
  isFirst,
  isLast,
  inGroup,
  isLead,
  letter,
}: {
  m: ProjectMember;
  projectId: string;
  isFirst: boolean;
  isLast: boolean;
  inGroup: boolean;
  isLead?: boolean;
  letter?: string;
}) {
  const [pending, start] = useTransition();

  // Local state for fields that affect computed values (margin / rev / buy).
  // Inputs are controlled, so margin recomputes immediately as the user types,
  // without waiting for the server round-trip.
  const [empType, setEmpType] = useState<string>(
    m.employment_type ?? "freelancer",
  );
  const [salary, setSalary] = useState<number>(m.salary ?? 0);
  const [buyRateLocal, setBuyRateLocal] = useState<number>(m.buy_rate ?? 0);
  const [sellRate, setSellRate] = useState<number>(m.sell_rate ?? 0);
  const [hpd, setHpd] = useState<number>(
    Math.round(((m.hours_load ?? 0) / 20) * 10) / 10,
  );

  // Re-sync state when fresh data arrives from the server (revalidate / realtime).
  useEffect(() => setEmpType(m.employment_type ?? "freelancer"), [m.employment_type]);
  useEffect(() => setSalary(m.salary ?? 0), [m.salary]);
  useEffect(() => setBuyRateLocal(m.buy_rate ?? 0), [m.buy_rate]);
  useEffect(() => setSellRate(m.sell_rate ?? 0), [m.sell_rate]);
  useEffect(
    () => setHpd(Math.round(((m.hours_load ?? 0) / 20) * 10) / 10),
    [m.hours_load],
  );

  const isStaff = empType === "staff";
  const buy = isStaff ? salary / HOURS_PER_MONTH : buyRateLocal;
  const margin = sellRate - buy;
  const marginPct = sellRate > 0 ? (margin / sellRate) * 100 : 0;
  const hoursLoad = hpd * 20;
  const revMonth = sellRate * hoursLoad;
  const low = margin < 20;

  const save = (field: string, value: string | number | boolean | null) => {
    start(async () => {
      try {
        await patchMember(projectId, m.id, field, value);
      } catch (e) {
        reportActionError(e, "Не сохранилось");
      }
    });
  };

  const inputCls =
    "w-full bg-transparent rounded px-1 py-0.5 hover:bg-muted/40 focus:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary";
  const numCls = `${inputCls} text-right`;
  const marginCls = low ? "text-bad" : "text-good";

  const move = (direction: "up" | "down") => {
    start(async () => {
      try {
        await moveMember(projectId, m.id, direction);
      } catch (e) {
        reportActionError(e, "Не получилось");
      }
    });
  };

  // In a group, only the lead row carries the shared sell_rate / hours.
  // All group rows (lead + followers) hide the per-row margin / rev /
  // % / hpd cells — those are aggregated in the summary row above.
  const sellEditable = !inGroup || !!isLead;
  const hideAggregates = inGroup;
  const dash = <span className="text-muted-foreground">—</span>;

  return (
    <tr
      className={`border-b border-border/50 hover:bg-muted/20 transition ${pending ? "opacity-50" : ""} ${inGroup ? "bg-primary/[0.025]" : ""}`}
    >
      <td className={`p-1.5 ${inGroup ? "border-l-2 border-primary/40" : ""}`}>
        <div className="flex flex-col items-center gap-0 leading-none">
          <button
            type="button"
            onClick={() => move("up")}
            disabled={isFirst || pending}
            className="text-muted-foreground hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed text-[10px] leading-none px-1"
            title="Выше"
            aria-label="Переместить выше"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => move("down")}
            disabled={isLast || pending}
            className="text-muted-foreground hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed text-[10px] leading-none px-1"
            title="Ниже"
            aria-label="Переместить ниже"
          >
            ▼
          </button>
        </div>
      </td>
      <td className="p-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {inGroup && letter ? (
            <span className="font-mono text-muted-foreground/70 shrink-0 text-[11px] tracking-wider">
              └─ <span className="text-muted-foreground">{letter}</span>
            </span>
          ) : null}
          <input
            defaultValue={m.dev_name}
            onBlur={(e) => save("dev_name", e.target.value)}
            className={`${inputCls} flex-1 min-w-0`}
          />
        </div>
      </td>
      <td className="p-1.5">
        <input
          defaultValue={m.role ?? ""}
          onBlur={(e) => save("role", e.target.value)}
          className={inputCls}
          placeholder="—"
        />
      </td>
      <td className="p-1.5">
        <select
          value={empType}
          onChange={(e) => {
            setEmpType(e.target.value);
            save("employment_type", e.target.value);
          }}
          className={inputCls}
        >
          <option value="freelancer">Фрилансер</option>
          <option value="staff">Штатный</option>
        </select>
      </td>
      <td className="p-1.5 text-right">
        {isStaff ? (
          <input
            type="number"
            step="0.01"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value) || 0)}
            onBlur={(e) => save("salary", Number(e.target.value) || 0)}
            className={numCls}
          />
        ) : (
          dash
        )}
      </td>
      <td className="p-1.5 text-right">
        {isStaff ? (
          <span className="text-muted-foreground">{fmtRate(buy)}</span>
        ) : (
          <input
            type="number"
            step="0.01"
            value={buyRateLocal}
            onChange={(e) => setBuyRateLocal(Number(e.target.value) || 0)}
            onBlur={(e) => save("buy_rate", Number(e.target.value) || 0)}
            className={numCls}
          />
        )}
      </td>
      <td className="p-1.5 text-right">
        {sellEditable ? (
          <input
            type="number"
            step="0.01"
            value={sellRate}
            onChange={(e) => setSellRate(Number(e.target.value) || 0)}
            onBlur={(e) => save("sell_rate", Number(e.target.value) || 0)}
            className={numCls}
          />
        ) : (
          dash
        )}
      </td>
      <td className={`p-1.5 text-right ${hideAggregates ? "" : marginCls}`}>
        {hideAggregates ? dash : fmtRate(margin)}
      </td>
      <td className={`p-1.5 text-right ${hideAggregates ? "" : marginCls}`}>
        {hideAggregates ? dash : `${marginPct.toFixed(1)}%`}
      </td>
      <td className="p-1.5 text-right text-muted-foreground">
        {hideAggregates ? dash : `$${Math.round(revMonth).toLocaleString()}`}
      </td>
      <td className="p-1.5 text-right">
        {sellEditable ? (
          <input
            type="number"
            step={0.1}
            value={hpd}
            onChange={(e) => setHpd(parseFloat(e.target.value) || 0)}
            onBlur={(e) =>
              save("hours_load", (parseFloat(e.target.value) || 0) * 20)
            }
            className={numCls}
          />
        ) : (
          dash
        )}
      </td>
      <td className="p-1.5">
        <input
          type="date"
          defaultValue={m.dev_start_date ?? ""}
          onBlur={(e) => save("dev_start_date", e.target.value || null)}
          className={inputCls}
        />
      </td>
      <td className="p-1.5">
        <input
          type="date"
          defaultValue={m.dev_end_date ?? ""}
          onBlur={(e) => save("dev_end_date", e.target.value || null)}
          className={inputCls}
        />
      </td>
      <td className="p-1.5">
        <select
          defaultValue={m.is_active === false ? "false" : "true"}
          onChange={(e) => save("is_active", e.target.value === "true")}
          className={inputCls}
        >
          <option value="true">Активен</option>
          <option value="false">Завершён</option>
        </select>
      </td>
      <td className="p-1.5 text-center">
        <div className="flex items-center justify-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              const cur = m.group_label ?? "";
              const next = window.prompt(
                "Группа (общий sell на всех; пусто — отвязать):",
                cur,
              );
              if (next === null) return;
              save("group_label", next.trim() || null);
            }}
            className="text-muted-foreground hover:text-primary text-[12px] px-1"
            title={
              m.group_label
                ? `В группе «${m.group_label}» — клик чтобы изменить`
                : "Привязать к группе"
            }
            aria-label="Группа"
          >
            🔗
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm(`Удалить ${m.dev_name}?`)) return;
              start(async () => {
                try {
                  await removeMember(projectId, m.id, m.dev_name);
                } catch (e) {
                  reportActionError(e, "Не удалилось");
                }
              });
            }}
            className="text-muted-foreground hover:text-bad text-base px-1"
            title="Удалить"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddMemberRow({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const [empType, setEmpType] = useState<"staff" | "freelancer">("freelancer");
  const isStaff = empType === "staff";

  return (
    <form
      action={async (fd) => {
        try {
          await addMember(projectId, fd);
          onDone();
        } catch (e) {
          reportActionError(e, "Не добавилось");
        }
      }}
      className="flex flex-wrap gap-2 p-3 border-b bg-muted/20 items-end"
    >
      <Field name="dev_name" label="Имя" required className="min-w-[180px]" />
      <Field name="role" label="Роль" placeholder="Dev / QA / PM" />
      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
          Тип
        </span>
        <select
          name="employment_type"
          value={empType}
          onChange={(e) => setEmpType(e.target.value as "staff" | "freelancer")}
          className="h-9 px-2 text-sm rounded border bg-background"
        >
          <option value="freelancer">Фрилансер</option>
          <option value="staff">Штатный</option>
        </select>
      </div>
      {isStaff ? (
        <Field name="salary" label="Salary/мес" type="number" step="0.01" required />
      ) : (
        <Field name="buy_rate" label="Buy ($/h)" type="number" step="0.01" required />
      )}
      <Field name="sell_rate" label="Sell ($/h)" type="number" step="0.01" required />
      <Field
        name="hours_load"
        label="Часов/мес"
        type="number"
        step="0.01"
        defaultValue="160"
      />
      <Field name="dev_start_date" label="Старт" type="date" />
      <Button type="submit" size="sm">
        Добавить
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  className,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      <Input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={step}
        className="h-9"
      />
    </div>
  );
}
