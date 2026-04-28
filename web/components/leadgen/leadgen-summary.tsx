import type { Entry } from "@/lib/schemas";
import { catMeta, CAT_KEYS } from "./categories";

export function LeadgenSummary({
  entries,
  peopleById,
  rangeLabel,
}: {
  entries: Entry[];
  peopleById: Map<string, string>;
  rangeLabel: string;
}) {
  const total = entries.reduce((s, e) => s + (e.bonus || 0), 0);
  const positive = entries.filter((e) => (e.bonus || 0) > 0);

  // total per person → top
  const byPerson = new Map<string, number>();
  for (const e of positive)
    byPerson.set(e.person_id, (byPerson.get(e.person_id) ?? 0) + e.bonus);
  const ranked = Array.from(byPerson.entries())
    .map(([pid, v]) => ({ name: peopleById.get(pid) ?? "?", val: v }))
    .sort((a, b) => b.val - a.val);

  const top = ranked.slice(0, 3);
  const participants = ranked.length;
  const avgBonus = participants > 0 ? total / participants : 0;

  // per-category totals
  const byCat: Record<string, number> = {};
  for (const k of CAT_KEYS) byCat[k] = 0;
  for (const e of positive) byCat[e.cat] = (byCat[e.cat] || 0) + e.bonus;

  return (
    <div className="rounded-md border bg-card/60 p-4 mb-5 space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <Cell label="Всего бонусов" value={`$${total.toLocaleString("en-US")}`} accent />
        <Cell label="Участников" value={participants.toString()} />
        <Cell label="Записей" value={positive.length.toString()} />
        <Cell label="В среднем" value={`$${Math.round(avgBonus).toLocaleString("en-US")}`} tone="info" />
        <div className="ml-auto pl-4 border-l border-border font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
          {rangeLabel}
        </div>
      </div>

      {top.length > 0 ? (
        <div className="border-t border-border pt-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Топ за период
          </div>
          <ol className="grid gap-1.5 sm:grid-cols-3">
            {top.map((r, i) => (
              <li
                key={r.name}
                className="flex items-baseline gap-2 rounded bg-muted/30 px-3 py-1.5"
              >
                <span className="font-display text-sm text-muted-foreground w-4">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate text-sm text-foreground">
                  {r.name}
                </span>
                <span className="font-display text-base text-primary">
                  ${r.val.toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {Object.values(byCat).some((v) => v > 0) ? (
        <div className="border-t border-border pt-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            По категориям
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {CAT_KEYS.filter((k) => byCat[k] > 0).map((k) => {
              const meta = catMeta(k);
              const pct = total === 0 ? 0 : (byCat[k] / total) * 100;
              return (
                <div key={k} className="flex items-baseline gap-2 font-mono">
                  <span
                    className={`size-2 rounded-full ${meta.bg.replace("/30", "")}`}
                  />
                  <span className="text-muted-foreground text-xs">{meta.label}</span>
                  <span className={`${meta.text} font-display text-base`}>
                    ${byCat[k].toLocaleString("en-US")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "info";
}) {
  const cls = accent
    ? "text-primary"
    : tone === "info"
      ? "text-info"
      : "text-foreground";
  return (
    <div className="min-w-[120px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-display text-2xl leading-none ${cls}`}>{value}</div>
    </div>
  );
}
