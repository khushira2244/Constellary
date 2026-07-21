"use server";

import { redirect } from "next/navigation";

import {
  fieldErrors,
  loginSchema,
  safeInternalReturnPath,
  signupSchema,
  type AuthActionResult,
} from "@/features/auth/model";
import { emailConfirmationRedirectUrl } from "@/features/auth/urls";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const invalid = error.message.toLowerCase().includes("invalid login credentials");
    return {
      ok: false,
      message: invalid
        ? "The email or password is incorrect."
        : "Sign in failed. Please try again.",
    };
  }

  return { ok: true, status: "authenticated" };
}

export async function signupAction(input: {
  displayName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  returnTo?: string;
}): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: emailConfirmationRedirectUrl(
        process.env.NEXT_PUBLIC_APP_URL,
        input.returnTo,
      ),
      data: {
        full_name: parsed.data.displayName,
        user_name: parsed.data.username,
      },
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    return {
      ok: false,
      message: message.includes("already registered")
        ? "An account already exists for this email."
        : message.includes("password")
          ? error.message
          : "Account creation failed. Please try again.",
    };
  }

  return {
    ok: true,
    status: data.session ? "authenticated" : "confirmation_required",
  };
}

export type AuthFormState = AuthActionResult & {
  email?: string;
};

export async function loginFormAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await loginAction({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) return result;
  redirect(safeInternalReturnPath(String(formData.get("returnTo") ?? "")));
}

export async function signupFormAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const result = await signupAction({
    displayName: String(formData.get("displayName") ?? ""),
    username: String(formData.get("username") ?? ""),
    email,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    returnTo: String(formData.get("returnTo") ?? ""),
  });
  if (!result.ok) return { ...result, email };
  if (result.status === "authenticated") {
    redirect(safeInternalReturnPath(String(formData.get("returnTo") ?? "")));
  }
  return { ...result, email };
}

export async function signOutAction(): Promise<{ ok: boolean }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  return { ok: !error };
}
