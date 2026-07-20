import type { InvoiceTemplate } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  InvoiceTemplateDialog,
  type ProjectOption,
} from "./invoice-template-dialog";
import { TemplateRowActions } from "./template-row-actions";

type Project = { id: string; name: string; status?: string | null };

/**
 * Table of every project on the platform. For each project we surface:
 *   - its planned monthly billing (sum of sell_rate * hours_load), so
 *     the user can compare "what we should bill" against what the
 *     recurring template is set to,
 *   - the list of active recurring invoice templates already configured
 *     for that project (usually 0 or 1),
 *   - a button to spin up a new recurring template for the project,
 *     pre-selecting its id in the dialog.
 */
export function ProjectsTab({
  projectOptions,
  projects,
  templatesByProject,
}: {
  projectOptions: ProjectOption[];
  projects: Project[];
  templatesByProject: Map<string, InvoiceTemplate[]>;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card py-16 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          Проектов пока нет — заведи хотя бы один на /projects.
        </p>
      </div>
    );
  }

  return (
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
          {projects.map((p) => {
            const opt = projectOptions.find((o) => o.id === p.id);
            const templates = templatesByProject.get(p.id) ?? [];
            const planned = opt?.planned_monthly ?? 0;
            return (
              <tr
                key={p.id}
                className="border-b border-border/40 hover:bg-muted/20 transition align-top"
              >
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    {p.status && p.status !== "active" ? (
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                        {p.status}
                      </span>
                    ) : null}
                  </div>
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
  );
}
