"use client";

import Link from "next/link";
import { useState } from "react";
import type { InvoiceTemplate } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import type { ProjectOption } from "./invoice-template-dialog";

type Project = {
  id: string;
  name: string;
  status?: string | null;
};

export type ProjectScope = "all" | "support" | "hays" | "done";

const isHays = (name: string) => /hays/i.test(name);
const statusOf = (p: Project) => p.status ?? "active";
const isActive = (p: Project) => statusOf(p) === "active";
const isSupport = (p: Project) => statusOf(p) === "support";
// "Завершённые" = anything that's neither active nor support (completed,
// paused, inactive…). We deliberately keep these reachable so the user can
// open a closed project and check its invoices / overdue.
const isDone = (p: Project) => !isActive(p) && !isSupport(p);

function inScope(p: Project, scope: ProjectScope): boolean {
  switch (scope) {
    case "all":
      return isActive(p);
    case "support":
      return isSupport(p);
    case "hays":
      // Client cut across every status — includes closed HAYS projects.
      return isHays(p.name);
    case "done":
      return isDone(p);
  }
}

/**
 * Read-only overview of projects, split into four scopes: активные /
 * суппорт / HAYS / завершённые. Rows link into /invoices/projects/[id],
 * where the user manages that project's invoices + recurring templates —
 * including closed projects, so overdue / issued invoices on finished work
 * stay auditable. This tab intentionally has NO inline actions.
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

  const counts: Record<ProjectScope, number> = {
    all: projects.filter(isActive).length,
    support: projects.filter(isSupport).length,
    hays: projects.filter((p) => isHays(p.name)).length,
    done: projects.filter(isDone).length,
  };

  const scoped = projects.filter((p) => inScope(p, scope));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? scoped.filter((p) => p.name.toLowerCase().includes(q))
    : scoped;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <ScopeSwitches scope={scope} counts={counts} />
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
              : emptyHint(scope)}
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="text-left p-3 font-normal">Проект</th>
                <th className="text-right p-3 font-normal">Планируется/мес</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const opt = projectOptions.find((o) => o.id === p.id);
                const templates = templatesByProject.get(p.id) ?? [];
                const activeTemplates = templates.filter(
                  (t) => t.active !== false,
                );
                const planned = opt?.planned_monthly ?? 0;
                const status = statusOf(p);
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
                        <div className="mt-1 space-y-0.5">
                          {status !== "active" ? (
                            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              {status}
                            </span>
                          ) : null}
                          {activeTemplates.length > 0 ? (
                            activeTemplates.map((t) => (
                              <div
                                key={t.id}
                                className="font-mono text-[11px] text-muted-foreground"
                              >
                                🔁 {describeFrequency(t)}
                              </div>
                            ))
                          ) : (
                            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
                              напоминание не настроено
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="p-3 text-right font-mono text-base text-muted-foreground align-top">
                      {planned > 0
                        ? `~$${planned.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                        : "—"}
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

function emptyHint(scope: ProjectScope): string {
  switch (scope) {
    case "hays":
      return 'HAYS-проектов нет — добавь "HAYS" в название проекта, чтобы отметить его.';
    case "support":
      return "Проектов в саппорте нет.";
    case "done":
      return "Завершённых проектов нет.";
    case "all":
      return "Активных проектов пока нет — заведи хотя бы один на /projects.";
  }
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
  if (freq === "weekly") {
    return "каждую неделю";
  }
  if (freq === "biweekly") {
    return "каждые 2 недели";
  }
  return "разово";
}

function ScopeSwitches({
  scope,
  counts,
}: {
  scope: ProjectScope;
  counts: Record<ProjectScope, number>;
}) {
  const items: { id: ProjectScope; label: string; count: number }[] = [
    { id: "all", label: "Все", count: counts.all },
    { id: "support", label: "Суппорт", count: counts.support },
    { id: "hays", label: "HAYS", count: counts.hays },
    { id: "done", label: "Завершённые", count: counts.done },
  ];
  return (
    <div className="flex items-center gap-1 flex-wrap">
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
