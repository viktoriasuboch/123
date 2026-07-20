import Link from "next/link";
import type {
  Invoice,
  InvoiceTemplate,
  DocumentReminder,
} from "@/lib/schemas";
import { effectiveStatus } from "./invoice-status-badge";
import { fmtDate, adjustedIssueDateISO } from "@/lib/calc";

type EventKind = "issue" | "pay" | "document" | "paid";
export type CalendarView = "month" | "week";

type DayEvent = {
  kind: EventKind;
  title: string;
  detail: string;
  projectId?: string;
  projectName?: string;
};

const EMOJI: Record<EventKind, string> = {
  issue: "🧾",
  pay: "💰",
  document: "📄",
  paid: "✅",
};

const TYPE_LABEL: Record<EventKind, string> = {
  issue: "выставить",
  pay: "оплата",
  document: "credit note",
  paid: "оплачено",
};

/**
 * Renders month or week view. `anchor` (YYYY-MM-DD) is any date inside
 * the range you want to look at; the view picks the enclosing month or
 * ISO week from it.
 */
export function InvoicesCalendar({
  view,
  anchor,
  invoices,
  templates,
  reminders,
  projects,
  selectedDay,
}: {
  view: CalendarView;
  anchor: string;
  invoices: Invoice[];
  templates: InvoiceTemplate[];
  reminders: DocumentReminder[];
  projects: Map<string, { id: string; name: string }>;
  /** YYYY-MM-DD of the day expanded in month view (ignored for week). */
  selectedDay?: string;
}) {
  const anchorDate = parseISODate(anchor) ?? new Date();
  const todayISO = new Date().toISOString().slice(0, 10);

  const monthRange = monthRangeFor(anchorDate);
  const weekRange = weekRangeFor(anchorDate);

  const events =
    view === "week"
      ? buildEvents(
          { start: weekRange.start, end: weekRange.workEnd },
          invoices,
          templates,
          reminders,
          projects,
        )
      : buildEvents(monthRange, invoices, templates, reminders, projects);

  const label =
    view === "month"
      ? new Date(monthRange.start).toLocaleDateString("ru-RU", {
          month: "long",
          year: "numeric",
        })
      : `${fmtDate(weekRange.start)} — ${fmtDate(weekRange.workEnd)}`;

  const prevAnchor = shiftAnchor(anchorDate, view, -1);
  const nextAnchor = shiftAnchor(anchorDate, view, +1);

  return (
    <section className="rounded-md border bg-card">
      <header className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={hrefFor(view, prevAnchor)}
            className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] hover:border-primary hover:text-primary transition"
            aria-label="Назад"
          >
            ←
          </Link>
          <h3 className="font-display text-lg tracking-wide leading-none capitalize">
            {label}
          </h3>
          <Link
            href={hrefFor(view, nextAnchor)}
            className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] hover:border-primary hover:text-primary transition"
            aria-label="Вперёд"
          >
            →
          </Link>
          <Link
            href={hrefFor(view, todayISO)}
            className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-primary hover:text-primary transition"
          >
            Сегодня
          </Link>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {(["month", "week"] as const).map((v) => {
            const active = v === view;
            return (
              <Link
                key={v}
                href={hrefFor(v, anchor)}
                className={`px-3 py-1 rounded font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "month" ? "Месяц" : "Неделя"}
              </Link>
            );
          })}
        </div>
      </header>

      {view === "month" ? (
        <MonthGrid
          anchorDate={anchorDate}
          events={events}
          selectedDay={selectedDay}
          todayISO={todayISO}
        />
      ) : (
        <WeekList weekRange={weekRange} events={events} todayISO={todayISO} />
      )}

      {view === "month" && selectedDay ? (
        <DayPanel
          iso={selectedDay}
          events={events.get(selectedDay) ?? []}
          anchor={anchor}
        />
      ) : null}
    </section>
  );
}

/* ─── month grid ──────────────────────────────────────────────────── */

function MonthGrid({
  anchorDate,
  events,
  selectedDay,
  todayISO,
}: {
  anchorDate: Date;
  events: Map<string, DayEvent[]>;
  selectedDay?: string;
  todayISO: string;
}) {
  const year = anchorDate.getFullYear();
  const month0 = anchorDate.getMonth();
  const cells = buildMonthGrid(year, month0);
  const monthISO = ymOf(anchorDate);

  return (
    <>
      <div className="grid grid-cols-7 border-b bg-muted/20">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <div
            key={d}
            className="p-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((c) => {
          const iso = c.iso;
          const dayEvents = iso ? events.get(iso) ?? [] : [];
          const isToday = iso === todayISO;
          const isSelected = iso === selectedDay;
          const hasEvents = dayEvents.length > 0;
          if (!iso) {
            return (
              <div key={c.key} className="min-h-[84px] border-b border-r" />
            );
          }
          const linkHref = isSelected
            ? `/invoices?tab=calendar&view=month&anchor=${monthISO}-01`
            : `/invoices?tab=calendar&view=month&anchor=${monthISO}-01&day=${iso}`;
          return (
            <Link
              key={c.key}
              href={linkHref}
              className={`min-h-[84px] border-b border-r p-1.5 flex flex-col gap-1 transition ${
                c.inMonth ? "" : "opacity-40"
              } ${isSelected ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted/30"}`}
            >
              <div
                className={`font-mono text-[11px] leading-none ${
                  isToday
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {c.day}
              </div>
              {hasEvents ? (
                <div className="flex flex-wrap gap-0.5 text-[13px] leading-none">
                  {dayEvents.slice(0, 6).map((e, i) => (
                    <span
                      key={i}
                      title={`${TYPE_LABEL[e.kind]}: ${e.title}`}
                      className="inline-block"
                    >
                      {EMOJI[e.kind]}
                    </span>
                  ))}
                  {dayEvents.length > 6 ? (
                    <span className="font-mono text-[9px] text-muted-foreground">
                      +{dayEvents.length - 6}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </>
  );
}

/* ─── week list view ──────────────────────────────────────────────── */

function WeekList({
  weekRange,
  events,
  todayISO,
}: {
  weekRange: { start: string; end: string; workEnd: string };
  events: Map<string, DayEvent[]>;
  todayISO: string;
}) {
  // Only Monday–Friday. Recurring reminders whose issue_day lands on a
  // weekend get sifted onto the next Monday by buildEvents, so we don't
  // lose them by dropping Sat/Sun.
  const days: string[] = [];
  const cur = parseISODate(weekRange.start)!;
  for (let i = 0; i < 5; i++) {
    const d = new Date(cur);
    d.setDate(cur.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">
      {days.map((iso) => {
        const evs = events.get(iso) ?? [];
        const d = parseISODate(iso)!;
        const isToday = iso === todayISO;
        const weekday = d.toLocaleDateString("ru-RU", { weekday: "long" });
        return (
          <div
            key={iso}
            className={`p-3 min-h-[180px] flex flex-col gap-2 ${
              isToday ? "bg-primary/5" : ""
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.18em] capitalize ${
                  isToday ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {weekday}
              </span>
              <span
                className={`font-display text-lg leading-none ${
                  isToday ? "text-primary" : ""
                }`}
              >
                {fmtDate(iso)}
              </span>
            </div>
            {evs.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground italic">
                —
              </p>
            ) : (
              <ul className="space-y-1.5 flex-1">
                {evs.map((e, i) => (
                  <EventItem key={i} event={e} compact />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── day panel (below month grid when a day is expanded) ─────────── */

function DayPanel({
  iso,
  events,
  anchor,
}: {
  iso: string;
  events: DayEvent[];
  anchor: string;
}) {
  return (
    <div className="border-t p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-base tracking-wide">
          {fmtDate(iso)}
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {events.length} событий
          </span>
        </h4>
        <Link
          href={`/invoices?tab=calendar&view=month&anchor=${anchor}`}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
        >
          × Закрыть
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground text-center py-4">
          На этот день событий не запланировано.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e, i) => (
            <EventItem key={i} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventItem({
  event,
  compact = false,
}: {
  event: DayEvent;
  compact?: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-2 rounded border border-border/40 ${
        compact ? "p-1.5" : "p-2 gap-3"
      }`}
    >
      <span className={`leading-none mt-0.5 ${compact ? "text-base" : "text-lg"}`} aria-hidden>
        {EMOJI[event.kind]}
      </span>
      <div className="flex-1 min-w-0">
        <div className={compact ? "text-xs" : "text-sm"}>
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground mr-1.5">
            {TYPE_LABEL[event.kind]}
          </span>
          <span className="font-medium">{event.title}</span>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground truncate">
          {event.projectId && event.projectName ? (
            <Link
              href={`/projects/${event.projectId}`}
              className="text-primary hover:underline"
            >
              {event.projectName}
            </Link>
          ) : null}
          {event.projectId && event.projectName && event.detail
            ? " · "
            : null}
          {event.detail}
        </div>
      </div>
    </li>
  );
}

/* ─── event building ──────────────────────────────────────────────── */

function buildEvents(
  range: { start: string; end: string },
  invoices: Invoice[],
  templates: InvoiceTemplate[],
  reminders: DocumentReminder[],
  projects: Map<string, { id: string; name: string }>,
): Map<string, DayEvent[]> {
  const events = new Map<string, DayEvent[]>();
  const push = (iso: string, ev: DayEvent) => {
    if (iso < range.start || iso > range.end) return;
    const list = events.get(iso);
    if (list) list.push(ev);
    else events.set(iso, [ev]);
  };

  // Which months does `range` intersect? For a month range it's one; for
  // a week range it can be one or two. We iterate months so we can
  // populate every recurring template / reminder day that lands in-range.
  const months = monthsSpanning(range.start, range.end);

  for (const inv of invoices) {
    const s = effectiveStatus(inv);
    const projName = projects.get(inv.project_id)?.name ?? "—";
    const label = `${inv.invoice_number ?? "—"} ${projName}`;
    const detail = `${inv.currency} ${formatAmount(inv.amount)} · ${inv.client_name}`;
    if (inv.due_date && s !== "cancelled" && s !== "paid") {
      push(inv.due_date, {
        kind: "pay",
        title: label,
        detail,
        projectId: inv.project_id,
        projectName: projName,
      });
    }
    if (inv.paid_date) {
      push(inv.paid_date, {
        kind: "paid",
        title: label,
        detail: `${inv.currency} ${formatAmount(inv.paid_amount ?? inv.amount)}`,
        projectId: inv.project_id,
        projectName: projName,
      });
    }
    if (inv.scheduled_date && s === "to_issue") {
      push(inv.scheduled_date, {
        kind: "issue",
        title: label,
        detail,
        projectId: inv.project_id,
        projectName: projName,
      });
    }
  }

  for (const monthISO of months) {
    const [y, mm] = monthISO.split("-").map((s) => parseInt(s, 10));
    for (const t of templates) {
      if (t.active === false || !t.issue_day) continue;
      // Weekend issue days → next business day.
      const iso = adjustedIssueDateISO(y, mm - 1, t.issue_day);
      push(iso, {
        kind: "issue",
        title: projects.get(t.project_id)?.name ?? "—",
        detail: `${t.client_name} · ~${t.currency} ${formatAmount(t.amount)}`,
        projectId: t.project_id,
        projectName: projects.get(t.project_id)?.name,
      });
    }
    for (const r of reminders) {
      if (r.active === false) continue;
      const iso = `${monthISO}-${String(r.expected_day).padStart(2, "0")}`;
      push(iso, {
        kind: "document",
        title: r.name,
        detail: "",
        projectId: r.project_id,
        projectName: projects.get(r.project_id)?.name,
      });
    }
  }

  return events;
}

/* ─── ranges / dates ──────────────────────────────────────────────── */

function monthRangeFor(d: Date): { start: string; end: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function weekRangeFor(d: Date): {
  start: string;
  end: string;
  workEnd: string;
} {
  // Monday as first day. `end` is the Sunday (calendar range for event
  // filtering — templates might land on the weekend before we shift
  // them into Monday). `workEnd` is the Friday — what we actually show
  // in the week view because the user only cares about business days.
  const dow = (d.getDay() + 6) % 7;
  const s = new Date(d);
  s.setDate(d.getDate() - dow);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  const w = new Date(s);
  w.setDate(s.getDate() + 4);
  return {
    start: s.toISOString().slice(0, 10),
    end: e.toISOString().slice(0, 10),
    workEnd: w.toISOString().slice(0, 10),
  };
}

function monthsSpanning(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const s = parseISODate(startISO)!;
  const e = parseISODate(endISO)!;
  let cur = new Date(s.getFullYear(), s.getMonth(), 1);
  while (cur <= e) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
    );
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return out;
}

function shiftAnchor(d: Date, view: CalendarView, delta: -1 | 1): string {
  const nd = new Date(d);
  if (view === "month") {
    nd.setMonth(nd.getMonth() + delta);
    nd.setDate(1);
  } else {
    nd.setDate(nd.getDate() + delta * 7);
  }
  return nd.toISOString().slice(0, 10);
}

function hrefFor(view: CalendarView, anchor: string): string {
  return `/invoices?tab=calendar&view=${view}&anchor=${anchor}`;
}

function ymOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

type Cell = {
  key: string;
  iso: string | null;
  day: number;
  inMonth: boolean;
};

function buildMonthGrid(year: number, month0: number): Cell[] {
  const first = new Date(year, month0, 1);
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const daysPrev = new Date(year, month0, 0).getDate();

  const cells: Cell[] = [];
  for (let i = 0; i < firstDow; i++) {
    const day = daysPrev - firstDow + 1 + i;
    const prev = shiftMonthYm(year, month0, -1);
    cells.push({
      key: `p${i}`,
      iso: `${prev}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      key: `c${d}`,
      iso: `${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: true,
    });
  }
  while (cells.length < 42) {
    const d = cells.length - (firstDow + daysInMonth) + 1;
    const nxt = shiftMonthYm(year, month0, +1);
    cells.push({
      key: `n${d}`,
      iso: `${nxt}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: false,
    });
  }
  return cells;
}

function shiftMonthYm(year: number, month0: number, delta: number): string {
  const d = new Date(year, month0 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatAmount(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
