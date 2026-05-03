"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { isRedirectError } from "@/lib/errors";
import { importDeals, type ImportDealsResult } from "../../app/(protected)/leadgen/_actions";
import { toast } from "sonner";

export function ImportDealsButton({
  defaultType = "closed",
}: {
  defaultType?: "sql" | "closed";
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ImportDealsResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setResult(null);
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
        📤 Импорт CSV
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide">
            Импорт сделок из CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Файл должен содержать колонки (заголовок обязателен):
            <code className="block mt-2 rounded bg-muted px-2 py-1.5 text-[11px] font-mono text-foreground">
              project, leadgen, month, year, bonus, revenue, comment
            </code>
          </p>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
            <li>
              <b>month</b> — «Январь»…«Декабрь», «Янв» или 1–12
            </li>
            <li>
              <b>year</b> — 4 цифры
            </li>
            <li>
              <b>bonus</b> — число (можно с десятичной точкой)
            </li>
            <li>
              Если строка совпадает с существующей сделкой по проекту,
              месяцу, году и типу — она <b>обновится</b>, иначе создастся новая.
            </li>
          </ul>
        </div>

        <form
          action={(fd) => {
            // attach default type when no deal_type column present
            if (!fd.get("deal_type")) fd.set("deal_type", defaultType);
            start(async () => {
              try {
                const r = await importDeals(fd);
                setResult(r);
                if (r.errors.length === 0) {
                  toast.success(
                    `Импорт ОК: ${r.inserted} новых, ${r.updated} обновлено`,
                  );
                } else {
                  toast.warning(
                    `${r.inserted} новых, ${r.updated} обновлено, ${r.skipped} пропущено`,
                  );
                }
                if (fileRef.current) fileRef.current.value = "";
              } catch (err) {
                if (isRedirectError(err)) throw err;
                toast.error(`Ошибка: ${(err as Error).message}`);
              }
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Файл (.csv)
            </Label>
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm font-mono file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-border file:bg-muted file:text-foreground file:cursor-pointer"
            />
          </div>

          {result ? (
            <div className="rounded-md border bg-card p-3 text-xs font-mono space-y-1">
              <div>
                Создано: <b className="text-good">{result.inserted}</b>
              </div>
              <div>
                Обновлено: <b className="text-info">{result.updated}</b>
              </div>
              {result.skipped > 0 ? (
                <div>
                  Пропущено: <b className="text-bad">{result.skipped}</b>
                </div>
              ) : null}
              {result.errors.length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-bad text-[10px]">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {result ? "Закрыть" : "Отмена"}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Импортирую…" : "Загрузить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
