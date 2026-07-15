import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { currentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in? Straight to the landing.
  const user = await currentUser();
  if (user) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-2">
          <div className="text-4xl">🚀</div>
          <h1 className="font-display text-5xl text-primary leading-none">
            INTEREXY PLATFORM
          </h1>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground pt-2">
            Sign in with your work email
          </p>
        </div>
        <div className="rounded-md border bg-card p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
