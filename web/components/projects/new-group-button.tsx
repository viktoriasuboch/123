"use client";

import { useMemo, useState, useTransition } from "react";
import type { ProjectMember } from "@/lib/schemas";
import { reportActionError } from "@/lib/client-errors";
import { createMemberGroup } from "../../app/(protected)/projects/_actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewGroupButton({
  projectId,
  members,
}: {
  projectId: string;
  members: ProjectMember[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [leaderId, setLeaderId] = useState<string>("");
  const [sellRate, setSellRate] = useState<string>("");
  const [hoursLoad, setHoursLoad] = useState<string>("160");
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());

  // Only members of THIS project, not already inside someone else's
  // shared seat (they may already be a leader of an empty group, that's
  // fine — picking them simply re-uses their row as the new leader).
  const candidates = useMemo(
    () => members.filter((m) => m.is_active !== false),
    [members],
  );

  const reset = () => {
    setLeaderId("");
    setSellRate("");
    setHoursLoad("160");
    setFollowerIds(new Set());
  };

  const submit = () => {
    if (!leaderId) return;
    const sell = Number(sellRate);
    const hours = Number(hoursLoad);
    if (!Number.isFinite(sell) || sell < 0) return;
    if (!Number.isFinite(hours) || hours < 0) return;
    const fids = Array.from(followerIds).filter((id) => id !== leaderId);

    start(async () => {
      try {
        await createMemberGroup({
          projectId,
          leaderId,
          sellRate: sell,
          hoursLoad: hours,
          followerIds: fids,
        });
        setOpen(false);
        reset();
      } catch (e) {
        reportActionError(e, "Не получилось");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          />
        }
      >
        🔗 Группа
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Новая группа
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Ведущий разработчик *
            </Label>
            <select
              value={leaderId}
              onChange={(e) => {
                const next = e.target.value;
                setLeaderId(next);
                // Make sure leader isn't also in followers.
                setFollowerIds((s) => {
                  const n = new Set(s);
                  n.delete(next);
                  return n;
                });
              }}
              className="w-full h-10 px-3 rounded border bg-background text-sm font-mono"
            >
              <option value="">— выбери —</option>
              {candidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.dev_name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Имя ведущего станет названием группы.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Sell ($/h) *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={sellRate}
                onChange={(e) => setSellRate(e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Часов / мес
              </Label>
              <Input
                type="number"
                step="1"
                value={hoursLoad}
                onChange={(e) => setHoursLoad(e.target.value)}
                placeholder="160"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Подчинённые
            </Label>
            <div className="rounded border bg-background max-h-[240px] overflow-y-auto divide-y divide-border">
              {candidates.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground text-center">
                  В проекте нет членов команды
                </div>
              ) : (
                candidates
                  .filter((m) => m.id !== leaderId)
                  .map((m) => {
                    const checked = followerIds.has(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setFollowerIds((s) => {
                              const n = new Set(s);
                              if (e.target.checked) n.add(m.id);
                              else n.delete(m.id);
                              return n;
                            });
                          }}
                        />
                        <span className="font-mono text-sm flex-1">
                          {m.dev_name}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {m.role ?? "—"} ·{" "}
                          {m.employment_type === "staff" ? "штат" : "фриланс"}
                        </span>
                      </label>
                    );
                  })
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              У них sell обнулится — клиент платит один общий sell ведущему.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || !leaderId || sellRate === ""}
          >
            {pending ? "Создаю…" : "Создать группу"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
