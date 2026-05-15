"use client";

import { useEffect, useState, useTransition } from "react";
import type { ProjectMember } from "@/lib/schemas";
import { HOURS_PER_MONTH, fmtRate } from "@/lib/calc";

/** Accepts both "40.9" and "40,9"; returns 0 for non-numeric. */
function parseDecimal(s: string): number {
  if (typeof s !== "string") return 0;
  const n = parseFloat(s.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Render a number for a controlled text input — integer stays "50",
 *  fraction uses "." and drops trailing zeros (40.9, not 40,9 / 40.90). */
function fmtNumInput(v: number): string {
  if (!Number.isFinite(v)) return "0";
  if (Number.isInteger(v)) return v.toString();
  return (Math.round(v * 100) / 100).toString();
}

import { reportActionError } from "@/lib/client-errors";
import { patchMember, removeMember, addMember, moveMember } from "../../app/(protected)/projects/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewProxyButton } from "./new-proxy-button";
import { toast } from "sonner";

export function MembersTable({
  projectId,
  members,
  projectStatus = "active",
}: {
  projectId: string;
  members: ProjectMember[];
  projectStatus?: string;
}) {
  const showBilling = projectStatus === "support";
  const [showAdd, setShowAdd] = useState(false);

  return (
    <section className="rounded-md border bg-card overflow-x-auto">
      <header className="flex items-center justify-between p-4 border-b">
        <h2 className="font-display text-xl tracking-wide">Команда</h2>
        <div className="flex items-center gap-2">
          <NewProxyButton projectId={projectId} members={members} />
          <Button
            size="sm"
            variant={showAdd ? "ghost" : "default"}
            onClick={() => setShowAdd((s) => !s)}
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          >
            {showAdd ? "× Отмена" : "+ Добавить"}
          </Button>
        </div>
      </header>

      {showAdd ? (
        <AddMemberRow
          projectId={projectId}
          onDone={() => setShowAdd(false)}
        />
      ) : null}

      <table
        className={`w-full text-sm font-mono ${showBilling ? "min-w-[1380px]" : "min-w-[1290px]"} table-fixed`}
      >
        <colgroup>
          <col className="w-[44px]"  /> {/* ↕ move */}
          <col className="w-[210px]" /> {/* Имя */}
          <col className="w-[85px]"  /> {/* Роль */}
          <col className="w-[105px]" /> {/* Тип */}
          {showBilling ? <col className="w-[90px]" /> : null}
          <col className="w-[85px]"  /> {/* Зарплата */}
          <col className="w-[70px]"  /> {/* Buy */}
          <col className="w-[60px]"  /> {/* Sell */}
          <col className="w-[75px]"  /> {/* Маржа $ */}
          <col className="w-[65px]"  /> {/* Маржа % */}
          <col className="w-[85px]"  /> {/* Rev/мес */}
          <col className="w-[55px]"  /> {/* ч/день */}
          <col className="w-[135px]" /> {/* Старт */}
          <col className="w-[135px]" /> {/* Конец */}
          <col className="w-[105px]" /> {/* Статус */}
          <col className="w-[35px]"  /> {/* ✕ */}
        </colgroup>
        <thead>
          <tr className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground border-b">
            <th className="p-2"></th>
            <th className="text-center p-2 font-normal">Имя</th>
            <th className="text-center p-2 font-normal">Роль</th>
            <th className="text-center p-2 font-normal">Тип</th>
            {showBilling ? (
              <th className="text-center p-2 font-normal">Режим</th>
            ) : null}
            <th className="text-center p-2 font-normal">Зарплата</th>
            <th className="text-center p-2 font-normal">Buy</th>
            <th className="text-center p-2 font-normal">Sell</th>
            <th className="text-center p-2 font-normal">Маржа $</th>
            <th className="text-center p-2 font-normal">Маржа %</th>
            <th className="text-center p-2 font-normal">Rev/мес</th>
            <th className="text-center p-2 font-normal">ч/день</th>
            <th className="text-center p-2 font-normal">Старт</th>
            <th className="text-center p-2 font-normal">Конец</th>
            <th className="text-center p-2 font-normal">Статус</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {renderRows(members, projectId, showBilling)}
          {members.length === 0 ? (
            <tr>
              <td
                colSpan={showBilling ? 16 : 15}
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

function isProxyPair(list: ProjectMember[]): boolean {
  return (
    list.length === 2 &&
    list.some((m) => m.proxy_role === "face") &&
    list.some((m) => m.proxy_role === "worker")
  );
}

/**
 * Walk the (already sort_order-sorted) members list and render either
 * a singleton MemberRow, a Proxy pair (summary + face + worker rows),
 * or a legacy Group block (summary + member rows) for adjacent runs of
 * members sharing a `group_label`.
 */
function renderRows(
  members: ProjectMember[],
  projectId: string,
  showBilling: boolean,
) {
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
          showBilling={showBilling}
        />,
      ];
    }
    if (isProxyPair(slot.list)) {
      const face = slot.list.find((m) => m.proxy_role === "face")!;
      const worker = slot.list.find((m) => m.proxy_role === "worker")!;
      const bonusPerHour = (face.proxy_bonus ?? 0) / HOURS_PER_MONTH;
      const faceIdx = slot.firstIdx + slot.list.indexOf(face);
      const workerIdx = slot.firstIdx + slot.list.indexOf(worker);
      return [
        <ProxySummaryRow
          key={`proxy-${face.id}-${worker.id}`}
          face={face}
          worker={worker}
          projectId={projectId}
          showBilling={showBilling}
        />,
        <ProxyFaceRow
          key={face.id}
          m={face}
          projectId={projectId}
          isFirst={faceIdx === 0}
          isLast={faceIdx === total - 1}
          showBilling={showBilling}
        />,
        <MemberRow
          key={worker.id}
          m={worker}
          projectId={projectId}
          isFirst={workerIdx === 0}
          isLast={workerIdx === total - 1}
          inGroup={false}
          letter="✋"
          extraBuyPerHour={bonusPerHour}
          showBilling={showBilling}
        />,
      ];
    }
    return [
      <GroupSummaryRow
        key={`gs-${slot.label}-${slot.list[0].id}`}
        label={slot.label}
        list={slot.list}
        projectId={projectId}
        showBilling={showBilling}
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
          showBilling={showBilling}
        />
      )),
    ];
  });
}

function GroupSummaryRow({
  label,
  list,
  projectId,
  showBilling,
}: {
  label: string;
  list: ProjectMember[];
  projectId: string;
  showBilling: boolean;
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
      className={`border-b border-border/50 ${pending ? "opacity-50" : ""}`}
    >
      <td className="p-1.5"></td>
      <td className="p-1.5 truncate">{label}</td>
      <td className="p-1.5 text-muted-foreground">{list.length} чел</td>
      <td className="p-1.5"></td>
      {showBilling ? <td className="p-1.5"></td> : null}
      <td className="p-1.5"></td>
      <td className="p-1.5 text-center text-muted-foreground">{fmtRate(sumBuy)}</td>
      <td className="p-1.5 text-center text-muted-foreground">{fmtRate(sell)}</td>
      <td className={`p-1.5 text-center ${cls}`}>{fmtRate(margin)}</td>
      <td className={`p-1.5 text-center ${cls}`}>{marginPct.toFixed(1)}%</td>
      <td className="p-1.5 text-center text-muted-foreground">
        ${Math.round(rev).toLocaleString()}
      </td>
      <td className="p-1.5 text-center text-muted-foreground">
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
          className="text-muted-foreground hover:text-primary px-1"
          title="Переименовать или расформировать группу"
          aria-label="Изменить группу"
        >
          ✏️
        </button>
      </td>
    </tr>
  );
}

/* ─── proxy pair rows ─────────────────────────────────────────────── */

function ProxySummaryRow({
  face,
  worker,
  projectId,
  showBilling,
}: {
  face: ProjectMember;
  worker: ProjectMember;
  projectId: string;
  showBilling: boolean;
}) {
  const workerBuyPerHour =
    worker.employment_type === "staff"
      ? (worker.salary ?? 0) / HOURS_PER_MONTH
      : worker.buy_rate ?? 0;
  const bonusPerHour = (face.proxy_bonus ?? 0) / HOURS_PER_MONTH;
  const effBuy = workerBuyPerHour + bonusPerHour;
  const sell = worker.sell_rate ?? 0;
  const hours = worker.hours_load ?? 0;
  const margin = sell - effBuy;
  const marginPct = sell > 0 ? (margin / sell) * 100 : 0;
  const rev = sell * hours;
  const hpd = hours / 20;
  const cls = margin < 20 ? "text-bad" : "text-good";

  const [pending, start] = useTransition();
  const dissolve = () => {
    if (!confirm("Расформировать проксирование?")) return;
    start(async () => {
      try {
        for (const m of [face, worker]) {
          await patchMember(projectId, m.id, "proxy_role", null);
          await patchMember(projectId, m.id, "proxy_bonus", 0);
          await patchMember(projectId, m.id, "group_label", null);
        }
      } catch (e) {
        reportActionError(e, "Не сохранилось");
      }
    });
  };

  return (
    <tr
      className={`border-b border-border/50 ${pending ? "opacity-50" : ""}`}
    >
      <td className="p-1.5"></td>
      <td className="p-1.5 truncate" title={`Лицо: ${face.dev_name}`}>
        🎭 {face.dev_name}
      </td>
      <td className="p-1.5 text-muted-foreground">проксирование</td>
      <td className="p-1.5"></td>
      {showBilling ? <td className="p-1.5"></td> : null}
      <td className="p-1.5"></td>
      <td
        className="p-1.5 text-center text-muted-foreground"
        title={`${fmtRate(workerBuyPerHour)}/h исполнитель + ${fmtRate(bonusPerHour)}/h бонус`}
      >
        {fmtRate(effBuy)}
      </td>
      <td className="p-1.5 text-center text-muted-foreground">
        {fmtRate(sell)}
      </td>
      <td className={`p-1.5 text-center ${cls}`}>{fmtRate(margin)}</td>
      <td className={`p-1.5 text-center ${cls}`}>
        {marginPct.toFixed(1)}%
      </td>
      <td className="p-1.5 text-center text-muted-foreground">
        ${Math.round(rev).toLocaleString()}
      </td>
      <td className="p-1.5 text-center text-muted-foreground">
        {Math.round(hpd * 10) / 10}
      </td>
      <td className="p-1.5"></td>
      <td className="p-1.5"></td>
      <td className="p-1.5"></td>
      <td className="p-1.5 text-center">
        <button
          type="button"
          onClick={dissolve}
          disabled={pending}
          className="text-muted-foreground hover:text-bad px-1"
          title="Расформировать проксирование"
          aria-label="Расформировать"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function ProxyFaceRow({
  m,
  projectId,
  isFirst,
  isLast,
  showBilling,
}: {
  m: ProjectMember;
  projectId: string;
  isFirst: boolean;
  isLast: boolean;
  showBilling: boolean;
}) {
  const isStaff = m.employment_type === "staff";
  const [pending, start] = useTransition();
  const save = (field: string, value: string | number | boolean | null) => {
    start(async () => {
      try {
        await patchMember(projectId, m.id, field, value);
      } catch (e) {
        reportActionError(e, "Не сохранилось");
      }
    });
  };
  const move = (direction: "up" | "down") => {
    start(async () => {
      try {
        await moveMember(projectId, m.id, direction);
      } catch (e) {
        reportActionError(e, "Не получилось");
      }
    });
  };

  const inputCls =
    "w-full bg-transparent rounded px-1 py-0.5 hover:bg-muted/40 focus:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary text-center";
  const dash = <span className="text-muted-foreground">—</span>;

  return (
    <tr
      className={`border-b border-border/50 hover:bg-muted/20 transition ${pending ? "opacity-50" : ""}`}
    >
      <td className="p-1.5">
        <div className="flex flex-col items-center gap-0 leading-none">
          <button
            type="button"
            onClick={() => move("up")}
            disabled={isFirst || pending}
            className="text-muted-foreground hover:text-primary disabled:opacity-25 text-[10px] leading-none px-1"
            title="Выше"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => move("down")}
            disabled={isLast || pending}
            className="text-muted-foreground hover:text-primary disabled:opacity-25 text-[10px] leading-none px-1"
            title="Ниже"
          >
            ▼
          </button>
        </div>
      </td>
      <td className="p-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-muted-foreground/70 shrink-0 text-[11px]">
            └─ 🎭
          </span>
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
          defaultValue={m.employment_type ?? "freelancer"}
          onChange={(e) => save("employment_type", e.target.value)}
          className={inputCls}
        >
          <option value="freelancer">Фрилансер</option>
          <option value="staff">Штатный</option>
        </select>
      </td>
      {showBilling ? <td className="p-1.5 text-center">{dash}</td> : null}
      <td className="p-1.5 text-center">
        {isStaff ? (
          <input
            type="text"
            inputMode="decimal"
            defaultValue={fmtNumInput(m.salary ?? 0)}
            onBlur={(e) => save("salary", parseDecimal(e.target.value))}
            className={inputCls}
          />
        ) : (
          dash
        )}
      </td>
      <td
        className="p-1.5 text-muted-foreground"
        colSpan={6}
        title="Бонус лица за проксирование"
      >
        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
          <span>бонус</span>
          <input
            type="text"
            inputMode="decimal"
            defaultValue={fmtNumInput(m.proxy_bonus ?? 0)}
            onBlur={(e) => save("proxy_bonus", parseDecimal(e.target.value))}
            className={`${inputCls} w-[90px]`}
          />
          <span>$/мес</span>
        </div>
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
      <td className="p-1.5 text-center"></td>
    </tr>
  );
}

/* ─── normal member row ───────────────────────────────────────────── */

function MemberRow({
  m,
  projectId,
  isFirst,
  isLast,
  inGroup,
  isLead,
  letter,
  extraBuyPerHour = 0,
  showBilling = false,
}: {
  m: ProjectMember;
  projectId: string;
  isFirst: boolean;
  isLast: boolean;
  inGroup: boolean;
  isLead?: boolean;
  letter?: string;
  /** Added to per-hour buy when computing margin (e.g. amortised proxy bonus). */
  extraBuyPerHour?: number;
  /** When true the row renders an extra Режим cell (Fixed / TM). */
  showBilling?: boolean;
}) {
  const isTm = (m.billing_mode ?? "fixed") === "tm";
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
  const ownBuy = isStaff ? salary / HOURS_PER_MONTH : buyRateLocal;
  // For a proxy worker, the row also bears the face's bonus amortised
  // per hour, so margin accurately reflects the company's true cost.
  const buy = ownBuy + extraBuyPerHour;
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
  const numCls = `${inputCls} text-center`;
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
      className={`border-b border-border/50 hover:bg-muted/20 transition ${pending ? "opacity-50" : ""} ${isTm ? "text-muted-foreground/80" : ""}`}
      title={isTm ? "TM: часы не идут в нагрузку, цифры ориентировочные" : undefined}
    >
      <td className="p-1.5">
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
          {letter ? (
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
      {showBilling ? (
        <td className="p-1.5">
          <select
            defaultValue={m.billing_mode ?? "fixed"}
            onChange={(e) => save("billing_mode", e.target.value)}
            className={inputCls}
            title="TM = Time & Material; в этом случае часы не учитываются в нагрузке"
          >
            <option value="fixed">Fixed</option>
            <option value="tm">TM</option>
          </select>
        </td>
      ) : null}
      <td className="p-1.5 text-center">
        {isStaff ? (
          <input
            type="text"
            inputMode="decimal"
            value={fmtNumInput(salary)}
            onChange={(e) => setSalary(parseDecimal(e.target.value))}
            onBlur={(e) => save("salary", parseDecimal(e.target.value))}
            className={numCls}
          />
        ) : (
          dash
        )}
      </td>
      <td className="p-1.5 text-center">
        {isStaff ? (
          <span className="text-muted-foreground">{fmtRate(buy)}</span>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            value={fmtNumInput(buyRateLocal)}
            onChange={(e) => setBuyRateLocal(parseDecimal(e.target.value))}
            onBlur={(e) => save("buy_rate", parseDecimal(e.target.value))}
            className={numCls}
          />
        )}
      </td>
      <td className="p-1.5 text-center">
        {sellEditable ? (
          <input
            type="text"
            inputMode="decimal"
            value={fmtNumInput(sellRate)}
            onChange={(e) => setSellRate(parseDecimal(e.target.value))}
            onBlur={(e) => save("sell_rate", parseDecimal(e.target.value))}
            className={numCls}
          />
        ) : (
          dash
        )}
      </td>
      <td className={`p-1.5 text-center ${hideAggregates ? "" : marginCls}`}>
        {hideAggregates ? dash : fmtRate(margin)}
      </td>
      <td className={`p-1.5 text-center ${hideAggregates ? "" : marginCls}`}>
        {hideAggregates ? dash : `${marginPct.toFixed(1)}%`}
      </td>
      <td className="p-1.5 text-center text-muted-foreground">
        {hideAggregates ? dash : `$${Math.round(revMonth).toLocaleString()}`}
      </td>
      <td className="p-1.5 text-center">
        {sellEditable ? (
          <input
            type="text"
            inputMode="decimal"
            value={fmtNumInput(hpd)}
            onChange={(e) => setHpd(parseDecimal(e.target.value))}
            onBlur={(e) =>
              save("hours_load", parseDecimal(e.target.value) * 20)
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
        <button
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
