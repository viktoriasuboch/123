export const dynamic = "force-dynamic";

export default function InvoicesComingSoonPage() {
  return (
    <div className="max-w-3xl mx-auto py-24 text-center space-y-6">
      <div className="text-6xl">🚧</div>
      <h1 className="font-display text-4xl tracking-widest text-primary leading-none">
        INVOICES
      </h1>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Инвойс-трекер · В разработке
      </p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        Скоро тут будут: Kanban выставляемых счетов, рекуррентные шаблоны с
        напоминаниями на почту и дашборд по ожидаемым / просроченным оплатам.
      </p>
    </div>
  );
}
