"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { Panel } from "@/components/ui/panel";
import { loginFormAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {
  ok: true,
  status: "authenticated",
};

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(loginFormAction, initialState);
  const errors = state.ok ? {} : (state.fieldErrors ?? {});

  return (
    <AuthFrame>
      <Panel className="auth-panel">
        <div className="auth-panel__heading">
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in to Constellary</h1>
          <p>Continue building a traceable record of how your research ideas grow.</p>
        </div>
        <form action={formAction} noValidate>
          <input name="returnTo" type="hidden" value={returnTo} />
          <Field label="Email" error={errors.email}>
            <Input
              autoComplete="email"
              autoFocus
              inputMode="email"
              name="email"
              placeholder="you@example.com"
              type="email"
            />
          </Field>
          <PasswordField
            error={errors.password}
            name="password"
            show={showPassword}
            onShow={() => setShowPassword((current) => !current)}
          />
          {!state.ok ? <p className="auth-error" role="alert">{state.message}</p> : null}
          <Button className="auth-submit" disabled={isPending} type="submit">
            {isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="auth-switch">
          New to Constellary?{" "}
          <Link href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}>Create an account</Link>
        </p>
      </Panel>
    </AuthFrame>
  );
}

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/login">Constellary</Link>
      {children}
      <p className="auth-footnote">Research provenance, preserved from the first idea.</p>
    </main>
  );
}

export function PasswordField({
  label = "Password",
  error,
  name,
  show,
  autoComplete = "current-password",
  onShow,
}: {
  label?: string;
  error?: string;
  name: string;
  show: boolean;
  autoComplete?: string;
  onShow: () => void;
}) {
  return (
    <Field label={label} error={error}>
      <div className="password-control">
        <Input
          autoComplete={autoComplete}
          name={name}
          type={show ? "text" : "password"}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={onShow}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </Field>
  );
}
