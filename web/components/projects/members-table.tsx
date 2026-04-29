"use client";

import { useState, useTransition } from "react";
import type { ProjectMember } from "@/lib/schemas";
import { buyRate, marginPerHour } from "@/lib/calc";
import { patchMember, removeMember, addMember } from "../../app/(protected)/projects/_actions";
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

      <table className="w-full text-sm font-mono min-w-[1500px] table-fixed">
        <colgroup>
          <col className="w-[180px]" /> {/* Имя */}
          <col className="w-[110px]" /> {/* Роль */}
          <col className="w-[120px]" /> {/* Тип */}
          <col className="w-[100px]" /> {/* Зарплата */}
          <col className="w-[80px]"  /> {/* Buy */}
          <col className="w-[70px]"  /> {/* Sell */}
          <col className="w-[90px]"  /> {/* Маржа $ */}
          <col className="w-[80px]"  /> {/* Маржа % */}
          <col className="w-[100px]" /> {/* Rev/мес */}
          <col className="w-[70px]"  /> {/* ч/день */}
          <col className="w-[150px]" /> {/* Старт */}
          <col className="w-[150px]" /> {/* Конец */}
          <col className="w-[120px]" /> {/* Статус */}
          <col className="w-[40px]"  /> {/* ✕ */}
        </colgroup>
        <thead>
          <tr className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground border-b">
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
          {members.map((m) => (
            <MemberRow key={m.id} m={m} projectId={projectId} />
          ))}
          {members.length === 0 ? (
            <tr>
              <td
                colSpan={14}
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

function MemberRow({
  m,
  projectId,
}: {
  m: ProjectMember;
  projectId: string;
}) {
  const isStaff = m.employment_type === "staff";
  const buy = buyRate(m);
  const margin = marginPerHour(m);
  const marginPct = (m.sell_rate || 0) > 0 ? (margin / (m.sell_rate || 1)) * 100 : 0;
  const revMonth = (m.sell_rate || 0) * (m.hours_load || 0);
  const hpd = Math.round(((m.hours_load || 0) / 20) * 10) / 10;
  const low = margin < 20;
  const [pending, start] = useTransition();

  const save = (field: string, value: string | number | boolean | null) => {
    start(async () => {
      try {
        await patchMember(projectId, m.id, field, value);
      } catch (e) {
        toast.error(`Не сохранилось: ${(e as Error).message}`);
      }
    });
  };

  const inputCls =
    "w-full bg-transparent rounded px-1 py-0.5 hover:bg-muted/40 focus:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary";
  const numCls = `${inputCls} text-right`;
  const marginCls = low ? "text-bad" : "text-good";

  return (
    <tr
      className={`border-b border-border/50 hover:bg-muted/20 transition ${pending ? "opacity-50" : ""}`}
    >
      <td className="p-1.5">
        <input
          defaultValue={m.dev_name}
          onBlur={(e) => save("dev_name", e.target.value)}
          className={inputCls}
        />
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
          defaultValue={m.employment_type ?? "freelancer"}
          onChange={(e) => save("employment_type", e.target.value)}
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
            defaultValue={m.salary || 0}
            onBlur={(e) => save("salary", Number(e.target.value))}
            className={numCls}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-1.5 text-right">
        {isStaff ? (
          <span className="text-muted-foreground">${buy.toFixed(2)}</span>
        ) : (
          <input
            type="number"
            defaultValue={m.buy_rate || 0}
            onBlur={(e) => save("buy_rate", Number(e.target.value))}
            className={numCls}
          />
        )}
      </td>
      <td className="p-1.5 text-right">
        <input
          type="number"
          defaultValue={m.sell_rate || 0}
          onBlur={(e) => save("sell_rate", Number(e.target.value))}
          className={numCls}
        />
      </td>
      <td className={`p-1.5 text-right ${marginCls}`}>${margin.toFixed(2)}</td>
      <td className={`p-1.5 text-right ${marginCls}`}>{marginPct.toFixed(1)}%</td>
      <td className="p-1.5 text-right text-muted-foreground">
        ${Math.round(revMonth).toLocaleString()}
      </td>
      <td className="p-1.5 text-right">
        <input
          type="number"
          step={0.1}
          defaultValue={hpd}
          onBlur={(e) =>
            save("hours_load", (parseFloat(e.target.value) || 0) * 20)
          }
          className={numCls}
        />
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
        <button
          onClick={() => {
            if (!confirm(`Удалить ${m.dev_name}?`)) return;
            start(async () => {
              try {
                await removeMember(projectId, m.id, m.dev_name);
              } catch (e) {
                toast.error(`Не удалилось: ${(e as Error).message}`);
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

function AddMemberRow({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  return (
    <form
      action={async (fd) => {
        try {
          await addMember(projectId, fd);
          onDone();
        } catch (e) {
          toast.error(`Не добавилось: ${(e as Error).message}`);
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
          defaultValue="freelancer"
          className="h-9 px-2 text-sm rounded border bg-background"
        >
          <option value="freelancer">Фрилансер</option>
          <option value="staff">Штатный</option>
        </select>
      </div>
      <Field name="buy_rate" label="Buy ($/h)" type="number" />
      <Field name="sell_rate" label="Sell ($/h)" type="number" />
      <Field name="salary" label="Salary/мес" type="number" />
      <Field
        name="hours_load"
        label="Часов/мес"
        type="number"
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
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
        className="h-9"
      />
    </div>
  );
}
