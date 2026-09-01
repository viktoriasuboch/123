"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full" size="lg">
      {pending ? "Вхожу…" : "Войти"}
    </Button>
  );
}

export function LoginForm() {
  const [state, signIn] = useActionState<LoginState, FormData>(
    signInAction,
    {},
  );

  return (
    <form action={signIn} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-xs uppercase tracking-widest text-muted-foreground"
        >
          Рабочий email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoFocus
          required
          autoComplete="email"
          placeholder="you@interexy.com"
          defaultValue={state.email ?? ""}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-xs uppercase tracking-widest text-muted-foreground"
        >
          Пароль
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
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
