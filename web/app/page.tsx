import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen flex flex-col px-6 py-8 relative">
      <div className="flex items-center justify-end gap-3 mb-16">
        <span className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground">
          {user.email}
        </span>
        <ThemeToggle />
        <form action="/logout" method="POST">
          <button
            type="submit"
            className="px-3 py-1.5 rounded border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-destructive/60 hover:text-destructive transition"
          >
            Выход
          </button>
        </form>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl space-y-12">
          <header className="text-center space-y-2">
            <h1 className="font-display text-5xl sm:text-7xl text-primary leading-none">
              <span className="mr-3 align-middle text-4xl sm:text-6xl">🚀</span>
              INTEREXY PLATFORM
            </h1>
            <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted-foreground pt-2">
              Internal Operations Platform
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <SectionTile
              icon="📁"
              title="PROJECTS"
              description={["Команда · Рейты · Маржа", "Support · Проксирование"]}
              href="/projects"
              available
            />
            <SectionTile
              icon="🧾"
              title="INVOICES"
              description={["Рекуррентные · К выставлению", "Оплаты · Просроченные"]}
              href="/invoices"
              available
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionTile({
  icon,
  title,
  description,
  href,
  available,
}: {
  icon: string;
  title: string;
  description: string[];
  href: string;
  available: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative block rounded-md border bg-card p-8 transition hover:border-primary/60 hover:bg-card/80 ${available ? "" : "opacity-70"}`}
    >
      <span
        className={`absolute top-4 right-4 size-2 rounded-full ${available ? "bg-good" : "bg-warn"}`}
        aria-hidden
      />
      <div className="text-4xl mb-5">{icon}</div>
      <div className="font-display text-2xl tracking-wider text-foreground group-hover:text-primary transition leading-tight">
        {title}
      </div>
      <div className="mt-4 space-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground leading-relaxed">
        {description.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </Link>
  );
}
