import Link from "next/link";
import { hasSection } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasLeadgen, hasProjects] = await Promise.all([
    hasSection("leadgen"),
    hasSection("projects"),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6 flex-wrap">
          <Link href="/" className="font-display text-2xl text-primary tracking-widest">
            <span className="mr-2">💰</span>VICTORIA&apos;S PLATFORM
          </Link>
          <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
            {hasLeadgen ? (
              <Link
                href="/leadgen"
                className="px-3 py-1.5 rounded border border-border hover:border-primary/60 hover:text-primary transition"
              >
                Leadgen
              </Link>
            ) : null}
            {hasProjects ? (
              <Link
                href="/projects"
                className="px-3 py-1.5 rounded border border-border hover:border-primary/60 hover:text-primary transition"
              >
                Projects
              </Link>
            ) : null}
            <ThemeToggle />
            <form action="/logout" method="POST">
              <button
                type="submit"
                className="px-3 py-1.5 rounded border border-border text-muted-foreground hover:border-destructive/60 hover:text-destructive transition"
              >
                Выход
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
