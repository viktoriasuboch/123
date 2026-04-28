import Link from "next/link";
import { hasSection } from "@/lib/auth";

export default async function LandingPage() {
  const [hasLeadgen, hasProjects] = await Promise.all([
    hasSection("leadgen"),
    hasSection("projects"),
  ]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-12">
        <header className="text-center space-y-3">
          <h1 className="font-display text-6xl text-primary">LEADGE BONUS</h1>
          <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
            Internal dashboard
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <SectionTile
            title="Lead Generation"
            href={hasLeadgen ? "/leadgen" : "/login?section=leadgen"}
            unlocked={hasLeadgen}
          />
          <SectionTile
            title="Projects"
            href={hasProjects ? "/projects" : "/login?section=projects"}
            unlocked={hasProjects}
          />
        </div>
      </div>
    </main>
  );
}

function SectionTile({
  title,
  href,
  unlocked,
}: {
  title: string;
  href: string;
  unlocked: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative block rounded-md border bg-card p-8 transition hover:border-primary/60 hover:bg-card/80"
    >
      <div className="font-display text-3xl tracking-wider text-foreground group-hover:text-primary transition">
        {title}
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {unlocked ? "→ открыть" : "🔒 требуется пароль"}
      </div>
    </Link>
  );
}
