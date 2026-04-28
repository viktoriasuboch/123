import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { hasSection } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SectionId } from "@/lib/session";

const VALID = new Set<SectionId>(["leadgen", "projects"]);

const SECTION_TITLE: Record<SectionId, { title: string; icon: string }> = {
  leadgen: { title: "LEADGEN BONUS", icon: "🎯" },
  projects: { title: "PROJECTS", icon: "📁" },
};

type SearchParams = Promise<{ section?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const requested = (sp.section ?? "leadgen") as SectionId;
  if (!VALID.has(requested)) redirect("/");

  // already authorized? skip
  if (await hasSection(requested)) {
    redirect(`/${requested}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-2">
          <div className="text-4xl">{SECTION_TITLE[requested].icon}</div>
          <h1 className="font-display text-5xl text-primary leading-none">
            {SECTION_TITLE[requested].title}
          </h1>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground pt-2">
            Authentication required
          </p>
        </div>
        <div className="rounded-md border bg-card p-6">
          <LoginForm section={requested} />
        </div>
        <div className="text-center">
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition"
          >
            ← вернуться
          </Link>
        </div>
      </div>
    </main>
  );
}
