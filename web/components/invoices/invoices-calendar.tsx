import Link from "next/link";
import type {
  Invoice,
  InvoiceTemplate,
  DocumentReminder,
} from "@/lib/schemas";
import { effectiveStatus } from "./invoice-status-badge";

type EventKind = "issue" | "pay" | "document" | "paid";

type DayEvent = {
  kind: EventKind;
  title: string;
  detail: string;
};

/**
 * Renders a month grid (Mon-first, 6 rows). Each day gets a set of
 * event dots — click one to jump to the tab-scoped list. `?month=YYYY-MM`
 * in the URL controls which month is rendered; defaults to today's.
 */
export function InvoicesCalendar({
  monthISO,
  invoices,
  templates,
  reminders,
  projects,
  selectedDay,
}: {
  /** YYYY-MM. Which month grid to render. */
  monthISO: string;
  invoices: Invoice[];
  templates: InvoiceTemplate[];
  reminders: DocumentReminder[];
  projects: Map<string, { id: string; name: string }>;
  /** YYYY-MM-DD of the currently expanded day, if any. */
  selectedDay?: string;
}) {
  const [yearStr, monthStr] = monthISO.split("-");
  const year = parseInt(yearStr, 10);
  const month0 = parseInt(monthStr, 10) - 1;

  const events = buildEventsForMonth(
    { year, month0 },
    invoices,
    templates,
    reminders,
    projects,
  );

  const cells = buildMonthGrid(year, month0);
  const monthLabel = new Date(year, month0, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const prev = shiftMonth(year, month0, -1);
  const next = shiftMonth(year, month0, +1);
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <section className="rounded-md border bg-card">
      <header className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/invoices?tab=calendar&month=${prev}`}
            className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] hover:border-primary hover:text-primary transition"
            aria-label="Предыдущий месяц"
          >
            ←
          </Link>
          <h3 className="font-display text-lg tracking-wide leading-none capitalize">
            {monthLabel}
          </h3>
          <Link
            href={`/invoices?tab=calendar&month=${next}`}
            className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] hover:border-primary hover:text-primary transition"
            aria-label="Следующий месяц"
          >
            →
          </Link>
          {monthISO !== todayISO.slice(0, 7) ? (
            <Link
              href="/invoices?tab=calendar"
              className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-primary hover:text-primary transition"
            >
              Сегодня
            </Link>
          ) : null}
        </div>
        <Legend />
      </header>

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
          const inMonth = c.inMonth;
          if (!iso) {
            return <div key={c.key} className="min-h-[76px] border-b border-r" />;
          }
          const hasEvents = dayEvents.length > 0;
          return (
            <Link
              key={c.key}
              href={
                isSelected
                  ? `/invoices?tab=calendar&month=${monthISO}`
                  : `/invoices?tab=calendar&month=${monthISO}&day=${iso}`
              }
              className={`min-h-[76px] border-b border-r p-1.5 flex flex-col gap-1 transition ${
                inMonth ? "" : "opacity-40"
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
                <div className="flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 6).map((e, i) => (
                    <span
                      key={i}
                      className={`inline-block size-1.5 rounded-full ${dotClass(e.kind)}`}
                      title={`${TYPE_LABEL[e.kind]}: ${e.title}`}
                    />
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

      {selectedDay ? (
        <DayPanel
          iso={selectedDay}
          events={events.get(selectedDay) ?? []}
          monthISO={monthISO}
        />
      ) : null}
    </section>
  );
}

/* ─── legend ──────────────────────────────────────────────────────── */

const TYPE_LABEL: Record<EventKind, string> = {
  issue: "выставить",
  pay: "оплата",
  document: "документ",
  paid: "оплачено",
};

function dotClass(k: EventKind): string {
  return k === "issue"
    ? "bg-amber-500"
    : k === "pay"
      ? "bg-sky-500"
      : k === "document"
        ? "bg-violet-500"
        : "bg-good";
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
      {(["issue", "pay", "document", "paid"] as EventKind[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={`inline-block size-2 rounded-full ${dotClass(k)}`} />
          {TYPE_LABEL[k]}
        </span>
      ))}
    </div>
  );
}

/* ─── day panel (below the grid when a day is selected) ──────────── */

function DayPanel({
  iso,
  events,
  monthISO,
}: {
  iso: string;
  events: DayEvent[];
  monthISO: string;
}) {
  return (
    <div className="border-t p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-base tracking-wide">
          {iso}
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {events.length} событий
          </span>
        </h4>
        <Link
          href={`/invoices?tab=calendar&month=${monthISO}`}
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
            <li
              key={i}
              className="flex items-start gap-3 p-2 rounded border border-border/40"
            >
              <span
                className={`inline-block size-2 rounded-full mt-1.5 ${dotClass(e.kind)}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground mr-2">
                    {TYPE_LABEL[e.kind]}
                  </span>
                  <span className="font-medium">{e.title}</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {e.detail}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────────────────── */

function buildEventsForMonth(
  { year, month0 }: { year: number; month0: number },
  invoices: Invoice[],
  templates: InvoiceTemplate[],
  reminders: DocumentReminder[],
  projects: Map<string, { id: string; name: string }>,
): Map<string, DayEvent[]> {
  const events = new Map<string, DayEvent[]>();
  const push = (iso: string, ev: DayEvent) => {
    const list = events.get(iso);
    if (list) list.push(ev);
    else events.set(iso, [ev]);
  };

  const monthISO = `${year}-${String(month0 + 1).padStart(2, "0")}`;

  for (const inv of invoices) {
    const s = effectiveStatus(inv);
    const projName = projects.get(inv.project_id)?.name ?? "—";
    const label = `${inv.invoice_number ?? "—"} ${projName}`;
    const detail = `${inv.currency} ${formatAmount(inv.amount)} · ${inv.client_name}`;
    if (inv.due_date?.startsWith(monthISO) && s !== "cancelled" && s !== "paid") {
      push(inv.due_date, { kind: "pay", title: label, detail });
    }
    if (inv.paid_date?.startsWith(monthISO)) {
      push(inv.paid_date, {
        kind: "paid",
        title: label,
        detail: `${inv.currency} ${formatAmount(inv.paid_amount ?? inv.amount)}`,
      });
    }
    if (
      inv.scheduled_date?.startsWith(monthISO) &&
      s === "to_issue"
    ) {
      push(inv.scheduled_date, {
        kind: "issue",
        title: label,
        detail,
      });
    }
  }

  for (const t of templates) {
    if (t.active === false || !t.issue_day) continue;
    const iso = `${monthISO}-${String(t.issue_day).padStart(2, "0")}`;
    push(iso, {
      kind: "issue",
      title: projects.get(t.project_id)?.name ?? "—",
      detail: `${t.client_name} · ~${t.currency} ${formatAmount(t.amount)}`,
    });
  }

  for (const r of reminders) {
    if (r.active === false) continue;
    const iso = `${monthISO}-${String(r.expected_day).padStart(2, "0")}`;
    push(iso, {
      kind: "document",
      title: r.name,
      detail: projects.get(r.project_id)?.name ?? "—",
    });
  }

  return events;
}

type Cell = {
  key: string;
  iso: string | null;
  day: number;
  inMonth: boolean;
};

function buildMonthGrid(year: number, month0: number): Cell[] {
  const first = new Date(year, month0, 1);
  // Monday=0, ..., Sunday=6
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const daysPrev = new Date(year, month0, 0).getDate();

  const cells: Cell[] = [];
  // Leading cells (previous month tail)
  for (let i = 0; i < firstDow; i++) {
    const day = daysPrev - firstDow + 1 + i;
    const prev = shiftMonth(year, month0, -1);
    cells.push({
      key: `p${i}`,
      iso: `${prev}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: false,
    });
  }
  // In-month cells
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      key: `c${d}`,
      iso: `${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: true,
    });
  }
  // Trailing cells (next month head) to complete a 6x7 grid
  while (cells.length < 42) {
    const d = cells.length - (firstDow + daysInMonth) + 1;
    const nxt = shiftMonth(year, month0, +1);
    cells.push({
      key: `n${d}`,
      iso: `${nxt}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: false,
    });
  }
  return cells;
}

function shiftMonth(year: number, month0: number, delta: number): string {
  const d = new Date(year, month0 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatAmount(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
