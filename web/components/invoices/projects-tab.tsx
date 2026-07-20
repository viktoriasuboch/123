import Link from "next/link";
import type { InvoiceTemplate } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  InvoiceTemplateDialog,
  type ProjectOption,
} from "./invoice-template-dialog";
import { TemplateRowActions } from "./template-row-actions";

type Project = { id: string; name: string; status?: string | null };

export type ProjectScope = "all" | "hays";

const isHays = (name: string) => /hays/i.test(name);

/**
 * Table of every project on the platform. Rows link into
 * /projects/[id] where the full "Инвойсы по проекту" statistics live.
 * Scope switches let the user filter between all projects and HAYS
 * ones — same UX as the main /projects page.
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
  const haysCount = projects.filter((p) => isHays(p.name)).length;
  const filtered =
    scope === "hays" ? projects.filter((p) => isHays(p.name)) : projects;

  return (
    <div className="space-y-3">
      <ScopeSwitches
        scope={scope}
        allCount={projects.length}
        haysCount={haysCount}
      />

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-card py-16 text-center">
          <p className="font-mono text-xs text-muted-foreground">
            {scope === "hays"
              ? "HAYS-проектов пока нет — добавь \"HAYS\" в название проекта чтобы отметить его."
              : "Проектов пока нет — заведи хотя бы один на /projects."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="text-left p-3 font-normal">Проект</th>
                <th className="text-right p-3 font-normal">Планируется/мес</th>
                <th className="text-left p-3 font-normal">Рекуррентный инвойс</th>
                <th className="text-right p-3 font-normal" />
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
                    className="border-b border-border/40 hover:bg-muted/20 transition align-top"
                  >
                    <td className="p-3">
                      <Link
                        href={`/projects/${p.id}`}
                        className="group flex flex-col"
                      >
                        <span className="font-medium group-hover:text-primary transition inline-flex items-center gap-1.5">
                          {p.name}
                          <span
                            className="text-muted-foreground group-hover:text-primary transition"
                            aria-hidden
                          >
                            →
                          </span>
                        </span>
                        {p.status && p.status !== "active" ? (
                          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                            {p.status}
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {planned > 0
                        ? `~$${planned.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                        : "—"}
                    </td>
                    <td className="p-3">
                      {templates.length === 0 ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          не настроен
                        </span>
                      ) : (
                        <ul className="space-y-1.5">
                          {templates.map((t) => (
                            <li
                              key={t.id}
                              className="flex items-center gap-2 flex-wrap"
                            >
                              <span className="font-mono text-xs">
                                {t.currency}{" "}
                                {t.amount.toLocaleString("en-US", {
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                · {t.issue_day ? `${t.issue_day}-го` : "?"}
                              </span>
                              {t.active === false ? (
                                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                  пауза
                                </span>
                              ) : null}
                              <TemplateRowActions
                                template={t}
                                projects={projectOptions}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {opt ? (
                        <InvoiceTemplateDialog
                          projects={projectOptions}
                          defaultProjectId={p.id}
                          trigger={
                            <Button
                              size="sm"
                              variant={templates.length === 0 ? "default" : "outline"}
                              className="font-mono text-[10px] uppercase tracking-[0.15em]"
                            >
                              {templates.length === 0
                                ? "+ Настроить"
                                : "+ Ещё"}
                            </Button>
                          }
                        />
                      ) : null}
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
