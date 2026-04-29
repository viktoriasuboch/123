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
    <section className="rounded-md border bg-card">
      <header className="flex items-center justify-between p-4 border-b">
        <h2 className="font-display text-xl tracking-wide">
          Команда <span className="text-muted-foreground text-base">· {members.length}</span>
        </h2>
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
        <AddMemberForm projectId={projectId} onDone={() => setShowAdd(false)} />
      ) : null}

      {members.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-xs font-mono">
          Команда пуста
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <MemberCard key={m.id} m={m} projectId={projectId} />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── per-member card ───────────────────────────────────────────────── */

const inputCls =
  "w-full bg-transparent rounded px-1.5 py-1 hover:bg-muted/40 focus:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary text-sm font-mono";
const numCls = `${inputCls} text-right`;
const fieldLabel =
  "font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1";

function MemberCard({
  m,
  projectId,
}: {
  m: ProjectMember;
  projectId: string;
}) {
  const isStaff = m.employment_type === "staff";
  const buy = buyRate(m);
  const margin = marginPerHour(m);
  const marginPct =
    (m.sell_rate || 0) > 0 ? (margin / (m.sell_rate || 1)) * 100 : 0;
  const revMonth = (m.sell_rate || 0) * (m.hours_load || 0);
  const hpd = Math.round(((m.hours_load || 0) / 20) * 10) / 10;
  const low = margin < 20;
  const inactive = m.is_active === false;
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

  const marginCls = low ? "text-bad" : "text-good";

  return (
    <li
      className={`p-4 transition ${pending ? "opacity-60" : ""} ${inactive ? "opacity-75" : ""}`}
    >
      {/* Row 1: identity + status + delete */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end">
        <Field label="Имя">
          <input
            defaultValue={m.dev_name}
            onBlur={(e) => save("dev_name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Роль">
          <input
            defaultValue={m.role ?? ""}
            onBlur={(e) => save("role", e.target.value)}
            className={inputCls}
            placeholder="—"
          />
        </Field>
        <Field label="Тип">
          <select
            defaultValue={m.employment_type ?? "freelancer"}
            onChange={(e) => save("employment_type", e.target.value)}
            className={inputCls}
          >
            <option value="freelancer">Фрилансер</option>
            <option value="staff">Штатный</option>
          </select>
        </Field>
        <Field label="Статус">
          <select
            defaultValue={inactive ? "false" : "true"}
            onChange={(e) => save("is_active", e.target.value === "true")}
            className={inputCls}
          >
            <option value="true">Активен</option>
            <option value="false">Завершён</option>
          </select>
        </Field>
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
          className="size-9 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-bad hover:border-bad/60 transition"
          title="Удалить"
        >
          ✕
        </button>
      </div>

      {/* Row 2: rates */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {isStaff ? (
          <Field label="Зарплата $/мес">
            <input
              type="number"
              defaultValue={m.salary || 0}
              onBlur={(e) => save("salary", Number(e.target.value))}
              className={numCls}
            />
          </Field>
        ) : (
          <div className="hidden lg:block" />
        )}
        <Field label="Buy $/h">
          {isStaff ? (
            <span className="block px-1.5 py-1 text-sm font-mono text-muted-foreground text-right">
              ${buy.toFixed(2)}
            </span>
          ) : (
            <input
              type="number"
              defaultValue={m.buy_rate || 0}
              onBlur={(e) => save("buy_rate", Number(e.target.value))}
              className={numCls}
            />
          )}
        </Field>
        <Field label="Sell $/h">
          <input
            type="number"
            defaultValue={m.sell_rate || 0}
            onBlur={(e) => save("sell_rate", Number(e.target.value))}
            className={numCls}
          />
        </Field>
        <Field label="ч/день">
          <input
            type="number"
            step={0.1}
            defaultValue={hpd}
            onBlur={(e) =>
              save("hours_load", (parseFloat(e.target.value) || 0) * 20)
            }
            className={numCls}
          />
        </Field>
        <Computed label="Маржа $/h" value={`$${margin.toFixed(2)}`} cls={marginCls} />
        <Computed
          label="Маржа %"
          value={`${marginPct.toFixed(1)}%`}
          cls={marginCls}
        />
        <Computed
          label="Rev/мес"
          value={`$${Math.round(revMonth).toLocaleString()}`}
          cls="text-foreground"
        />
      </div>

      {/* Row 3: dates */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
        <Field label="Старт">
          <input
            type="date"
            defaultValue={m.dev_start_date ?? ""}
            onBlur={(e) => save("dev_start_date", e.target.value || null)}
            className={inputCls}
          />
        </Field>
        <Field label="Конец">
          <input
            type="date"
            defaultValue={m.dev_end_date ?? ""}
            onBlur={(e) => save("dev_end_date", e.target.value || null)}
            className={inputCls}
          />
        </Field>
      </div>
    </li>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className={fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

function Computed({
  label,
  value,
  cls,
}: {
  label: string;
  value: string;
  cls: string;
}) {
  return (
    <div className="min-w-0">
      <div className={fieldLabel}>{label}</div>
      <div
        className={`px-1.5 py-1 text-sm font-mono text-right ${cls}`}
        title="Вычисляется автоматически"
      >
        {value}
      </div>
    </div>
  );
}

/* ─── add-member form ───────────────────────────────────────────────── */

function AddMemberForm({
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
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 border-b bg-muted/20"
    >
      <AddField name="dev_name" label="Имя" required />
      <AddField name="role" label="Роль" placeholder="Dev / QA / PM" />
      <div className="flex flex-col gap-1">
        <span className={fieldLabel}>Тип</span>
        <select
          name="employment_type"
          defaultValue="freelancer"
          className="h-9 px-2 text-sm rounded border bg-background font-mono"
        >
          <option value="freelancer">Фрилансер</option>
          <option value="staff">Штатный</option>
        </select>
      </div>
      <AddField name="buy_rate" label="Buy $/h" type="number" />
      <AddField name="sell_rate" label="Sell $/h" type="number" />
      <AddField name="salary" label="Salary/мес" type="number" />
      <AddField
        name="hours_load"
        label="Часов/мес"
        type="number"
        defaultValue="160"
      />
      <AddField name="dev_start_date" label="Старт" type="date" />
      <div className="col-span-full flex justify-end gap-2 mt-1">
        <Button type="submit" size="sm">
          Добавить
        </Button>
      </div>
    </form>
  );
}

function AddField({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className={fieldLabel}>
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
