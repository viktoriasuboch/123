"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  sendOtpAction,
  verifyOtpAction,
  type EmailStepState,
  type OtpStepState,
} from "./actions";

function SubmitButton({
  idle,
  pending: pendingLabel,
}: {
  idle: string;
  pending: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full" size="lg">
      {pending ? pendingLabel : idle}
    </Button>
  );
}

export function LoginForm() {
  const [emailState, sendOtp] = useActionState<EmailStepState, FormData>(
    sendOtpAction,
    {},
  );

  // After the first successful send we swap to the OTP form. We keep
  // a local `email` in state so the OTP form always has the value
  // even if the user re-renders it.
  const [email, setEmail] = useState<string>("");
  const activeEmail = emailState.email ?? email;
  const showOtpStep = emailState.sent && !!activeEmail;

  if (!showOtpStep) {
    return (
      <form action={sendOtp} className="space-y-5">
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
            defaultValue={activeEmail}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        {emailState.error ? (
          <p className="text-sm text-destructive font-mono">
            {emailState.error}
          </p>
        ) : null}
        <SubmitButton idle="Отправить код" pending="Отправляю…" />
        <p className="text-[11px] text-muted-foreground font-mono text-center">
          На почту придёт 6-значный код (действителен 10 минут).
        </p>
      </form>
    );
  }

  return <OtpForm email={activeEmail} onBack={() => window.location.reload()} />;
}

function OtpForm({ email, onBack }: { email: string; onBack: () => void }) {
  const [state, verifyOtp] = useActionState<OtpStepState, FormData>(
    verifyOtpAction,
    { email },
  );
  return (
    <form action={verifyOtp} className="space-y-5">
      <input type="hidden" name="email" value={email} />
      <div className="space-y-2">
        <Label
          htmlFor="token"
          className="text-xs uppercase tracking-widest text-muted-foreground"
        >
          Код из письма
        </Label>
        <Input
          id="token"
          name="token"
          type="text"
          autoFocus
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          minLength={6}
          pattern="[0-9]{6}"
          placeholder="123456"
          className="h-11 text-center tracking-[0.4em] text-lg font-mono"
        />
        <p className="text-[11px] text-muted-foreground font-mono">
          Отправили на <span className="text-foreground">{email}</span>. Не пришло?
          Проверь спам или{" "}
          <button
            type="button"
            onClick={onBack}
            className="underline hover:text-foreground"
          >
            начни сначала
          </button>
          .
        </p>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive font-mono">{state.error}</p>
      ) : null}
      <SubmitButton idle="Войти" pending="Проверяю…" />
    </form>
  );
}
