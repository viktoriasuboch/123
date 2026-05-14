"use client";

import { useMemo, useState, useTransition } from "react";
import type { ProjectMember } from "@/lib/schemas";
import { reportActionError } from "@/lib/client-errors";
import { createProxy } from "../../app/(protected)/projects/_actions";
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

export function NewProxyButton({
  projectId,
  members,
}: {
  projectId: string;
  members: ProjectMember[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [faceId, setFaceId] = useState<string>("");
  const [workerId, setWorkerId] = useState<string>("");
  const [sellRate, setSellRate] = useState<string>("");
  const [hoursLoad, setHoursLoad] = useState<string>("160");
  const [bonus, setBonus] = useState<string>("");

  const candidates = useMemo(
    () => members.filter((m) => m.is_active !== false),
    [members],
  );

  const reset = () => {
    setFaceId("");
    setWorkerId("");
    setSellRate("");
    setHoursLoad("160");
    setBonus("");
  };

  const submit = () => {
    if (!faceId || !workerId || faceId === workerId) return;
    const sell = Number(sellRate.replace(",", "."));
    const hours = Number(hoursLoad.replace(",", "."));
    const bonusNum = Number(bonus.replace(",", "."));
    if (!Number.isFinite(sell) || sell < 0) return;
    if (!Number.isFinite(hours) || hours < 0) return;
    if (!Number.isFinite(bonusNum) || bonusNum < 0) return;

    start(async () => {
      try {
        await createProxy({
          projectId,
          faceId,
          workerId,
          sellRate: sell,
          hoursLoad: hours,
          bonus: bonusNum,
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
        🎭 Проксирование
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Новое проксирование
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Лицо известно клиенту, но не работает. Исполнитель реально
          выполняет работу. Бонус лица распределяется на час пропорционально
          часам исполнителя (бонус/160).
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Лицо для клиента *
            </Label>
            <select
              value={faceId}
              onChange={(e) => {
                const next = e.target.value;
                setFaceId(next);
                if (workerId === next) setWorkerId("");
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Исполнитель *
            </Label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full h-10 px-3 rounded border bg-background text-sm font-mono"
            >
              <option value="">— выбери —</option>
              {candidates
                .filter((m) => m.id !== faceId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.dev_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Sell ($/h) *
              </Label>
              <Input
                type="text"
                inputMode="decimal"
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
                type="text"
                inputMode="decimal"
                value={hoursLoad}
                onChange={(e) => setHoursLoad(e.target.value)}
                placeholder="160"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Бонус лица ($/мес) *
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              placeholder="500"
            />
            <p className="text-[10px] text-muted-foreground">
              На час: {bonusPreviewPerHour(bonus)}/h при 160 часах в месяце.
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
            disabled={
              pending ||
              !faceId ||
              !workerId ||
              faceId === workerId ||
              sellRate === "" ||
              bonus === ""
            }
          >
            {pending ? "Создаю…" : "Создать проксирование"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function bonusPreviewPerHour(raw: string): string {
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "$0";
  const perH = n / 160;
  const rounded = Math.round(perH * 100) / 100;
  return `$${Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2).replace(/\.?0+$/, "")}`;
}
