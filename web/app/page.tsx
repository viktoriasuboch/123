import Link from "next/link";
import { hasSection } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LandingPage() {
  const [hasLeadgen, hasProjects] = await Promise.all([
    hasSection("leadgen"),
    hasSection("projects"),
  ]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-4xl space-y-12">
        <header className="text-center space-y-2">
          <h1 className="font-display text-5xl sm:text-7xl text-primary leading-none">
            <span className="mr-3 align-middle text-4xl sm:text-6xl">💰</span>
            VICTORIA&apos;S PLATFORM
          </h1>
          <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted-foreground pt-2">
            Internal Operations Platform
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTile
            icon="🎯"
            title="LEADGEN BONUS"
            description={["Бонусы · Сделки SQL / Закрытые", "Зарплаты · Revenue"]}
            href={hasLeadgen ? "/leadgen" : "/login?section=leadgen"}
            unlocked={hasLeadgen}
          />
          <SectionTile
            icon="📁"
            title="PROJECTS"
            description={["Управление проектами", "Команда · Рейты · Маржа"]}
            href={hasProjects ? "/projects" : "/login?section=projects"}
            unlocked={hasProjects}
          />
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
  unlocked,
}: {
  icon: string;
  title: string;
  description: string[];
  href: string;
  unlocked: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative block rounded-md border bg-card p-8 transition hover:border-primary/60 hover:bg-card/80"
    >
      <span
        className={`absolute top-4 right-4 size-2 rounded-full ${unlocked ? "bg-good" : "bg-muted-foreground/40"}`}
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
