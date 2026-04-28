"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "./actions";
import type { SectionId } from "@/lib/session";

const SECTION_LABEL: Record<SectionId, string> = {
  leadgen: "Lead Generation",
  projects: "Projects",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full leopard-btn"
      size="lg"
    >
      {pending ? "Проверяю…" : "Войти"}
    </Button>
  );
}

export function LoginForm({ section }: { section: SectionId }) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="section" value={section} />
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">
          Пароль для раздела {SECTION_LABEL[section]}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          autoComplete="current-password"
          className="h-11"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive font-mono">{state.error}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
