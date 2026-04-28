import { requireSection } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeadgenPage() {
  await requireSection("leadgen");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl tracking-widest text-foreground">
        LEAD GENERATION
      </h1>
      <div className="rounded-md border bg-card p-8 space-y-3">
        <p className="font-mono text-sm text-muted-foreground">
          Раздел в процессе миграции. Пока используй legacy интерфейс по адресу <code className="text-foreground">/index.html</code>.
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>People + entries (бонусы по участникам)</li>
          <li>Months — агрегация по месяцам</li>
          <li>Summary — KPI по leadgen</li>
          <li>Deals — сделки с фильтрами</li>
          <li>Salaries — зарплаты</li>
          <li>Project revenues — ревеню по проектам</li>
        </ul>
      </div>
    </div>
  );
}
