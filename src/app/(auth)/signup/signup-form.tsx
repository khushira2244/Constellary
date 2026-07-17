"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { Panel } from "@/components/ui/panel";
import { signupFormAction, type AuthFormState } from "../actions";
import { AuthFrame, PasswordField } from "../login/login-form";

const initialState: AuthFormState = {
  ok: true,
  status: "authenticated",
};

export function SignupForm({ returnTo }: { returnTo: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(signupFormAction, initialState);
  const errors = state.ok ? {} : (state.fieldErrors ?? {});
  const confirmationRequired = state.ok && state.status === "confirmation_required";

  if (confirmationRequired) {
    return (
      <AuthFrame>
        <Panel className="auth-panel auth-success">
          <div className="success-mark" aria-hidden="true">✓</div>
          <span className="eyebrow">Account created</span>
          <h1>Check your email</h1>
          <p>
            Supabase requires email confirmation for this project. Open the confirmation
            link sent to <strong>{state.email}</strong>, then sign in.
          </p>
          <Link className="button button--primary auth-link-button" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
            Return to sign in
          </Link>
        </Panel>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <Panel className="auth-panel auth-panel--wide">
        <div className="auth-panel__heading">
          <span className="eyebrow">Create an account</span>
          <h1>Start your research provenance</h1>
          <p>Your profile is created securely from your Supabase Auth account.</p>
        </div>
        <form action={formAction} noValidate>
          <input name="returnTo" type="hidden" value={returnTo} />
          <div className="auth-field-grid">
            <Field label="Display name" error={errors.displayName}>
              <Input
                autoComplete="name"
                autoFocus
                maxLength={120}
                name="displayName"
              />
            </Field>
            <Field
              label="Username"
              hint="Lowercase letters, numbers, _ or -"
              error={errors.username}
            >
              <Input
                autoCapitalize="none"
                autoComplete="username"
                maxLength={30}
                name="username"
              />
            </Field>
          </div>
          <Field label="Email" error={errors.email}>
            <Input
              autoComplete="email"
              inputMode="email"
              name="email"
              type="email"
            />
          </Field>
          <div className="auth-field-grid">
            <PasswordField
              autoComplete="new-password"
              error={errors.password}
              name="password"
              show={showPassword}
              onShow={() => setShowPassword((current) => !current)}
            />
            <PasswordField
              autoComplete="new-password"
              label="Confirm password"
              error={errors.confirmPassword}
              name="confirmPassword"
              show={showConfirmPassword}
              onShow={() => setShowConfirmPassword((current) => !current)}
            />
          </div>
          {!state.ok ? <p className="auth-error" role="alert">{state.message}</p> : null}
          <Button className="auth-submit" disabled={isPending} type="submit">
            {isPending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="auth-switch">
          Already have an account?{" "}
          <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Sign in</Link>
        </p>
      </Panel>
    </AuthFrame>
  );
}
