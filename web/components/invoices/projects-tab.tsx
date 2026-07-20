"use client";

import Link from "next/link";
import { useState } from "react";
import type { InvoiceTemplate } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import type { ProjectOption } from "./invoice-template-dialog";
import { fmtDate } from "@/lib/calc";

type Project = {
  id: string;
  name: string;
  status?: string | null;
};

export type ProjectScope = "all" | "hays";

const isHays = (name: string) => /hays/i.test(name);

// Projects tab lists only projects we're actively billing. Completed
// and paused ones drop out — the tab is about live cashflow, and old
// projects would just clutter it. Only active + support survive.
const inScope = (p: Project) => {
  const s = p.status ?? "active";
  return s === "active" || s === "support";
};

/**
 * Read-only overview of every live project. Rows link into
 * /invoices/projects/[id], where the user manages that project's
 * invoices + recurring templates. This tab intentionally has NO
 * inline actions — configuration happens on the drill-down page.
 */
export function ProjectsTab({
  projectOptions,
  projects,
  templatesByProject,
  scope,
}: {
  projectOptions: ProjectOption[];
  projects: Project[];
  templatesByProject: Map<string, InvoiceTemplate[]>;
  scope: ProjectScope;
}) {
  const [query, setQuery] = useState("");

  const live = projects.filter(inScope);
  const liveHays = live.filter((p) => isHays(p.name));
  const scoped = scope === "hays" ? liveHays : live;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? scoped.filter((p) => p.name.toLowerCase().includes(q))
    : scoped;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <ScopeSwitches
          scope={scope}
          allCount={live.length}
          haysCount={liveHays.length}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск проекта…"
          className="h-9 max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-card py-16 text-center">
          <p className="font-mono text-xs text-muted-foreground">
            {q
              ? `По запросу «${query}» ничего не нашлось.`
              : scope === "hays"
                ? "HAYS-проектов пока нет — добавь \"HAYS\" в название проекта чтобы отметить его."
                : "Активных проектов пока нет — заведи хотя бы один на /projects."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="text-left p-3 font-normal">Проект</th>
                <th className="text-right p-3 font-normal">Планируется/мес</th>
                <th className="text-left p-3 font-normal">Периодичность</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const opt = projectOptions.find((o) => o.id === p.id);
                const templates = templatesByProject.get(p.id) ?? [];
                const planned = opt?.planned_monthly ?? 0;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/40 hover:bg-muted/20 transition"
                  >
                    <td className="p-3">
                      <Link
                        href={`/invoices/projects/${p.id}`}
                        className="block group"
                      >
                        <span className="font-display text-xl group-hover:text-primary transition leading-tight">
                          {p.name}
                        </span>
                        {p.status === "support" ? (
                          <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
                            support
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="p-3 text-right font-mono text-base text-muted-foreground align-middle">
                      {planned > 0
                        ? `~$${planned.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                        : "—"}
                    </td>
                    <td className="p-3 align-middle">
                      <FrequencyLabel templates={templates} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FrequencyLabel({ templates }: { templates: InvoiceTemplate[] }) {
  const active = templates.filter((t) => t.active !== false);
  if (active.length === 0) {
    return (
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
        не настроено
      </span>
    );
  }
  return (
    <ul className="space-y-0.5">
      {active.map((t) => (
        <li key={t.id} className="text-sm">
          {describeFrequency(t)}
        </li>
      ))}
    </ul>
  );
}

function describeFrequency(t: InvoiceTemplate): string {
  const freq = t.frequency ?? "monthly";
  if (freq === "monthly") {
    return t.issue_day
      ? `каждое ${t.issue_day}-е число месяца`
      : "каждый месяц";
  }
  if (freq === "quarterly") {
    return t.issue_day
      ? `раз в квартал, ${t.issue_day}-го числа`
      : "раз в квартал";
  }
  if (freq === "biweekly") {
    return t.next_issue_date
      ? `каждые 2 недели с ${fmtDate(t.next_issue_date)}`
      : "каждые 2 недели";
  }
  return "разово";
}

function ScopeSwitches({
  scope,
  allCount,
  haysCount,
}: {
  scope: ProjectScope;
  allCount: number;
  haysCount: number;
}) {
  const items: { id: ProjectScope; label: string; count: number }[] = [
    { id: "all", label: "Все", count: allCount },
    { id: "hays", label: "HAYS", count: haysCount },
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map((it) => {
        const active = it.id === scope;
        return (
          <Link
            key={it.id}
            href={`/invoices?tab=projects&scope=${it.id}`}
            className={`px-3 py-1 rounded-md border font-mono text-[10px] uppercase tracking-[0.15em] transition ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
            }`}
          >
            {it.label}{" "}
            <span className="opacity-60 ml-1">{it.count}</span>
          </Link>
        );
      })}
    </div>
  );
}
