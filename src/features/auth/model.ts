import { z } from "zod";

export const DEFAULT_AUTH_RETURN_PATH = "/";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your display name.").max(120),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be 30 characters or fewer.")
    .regex(
      /^[a-z0-9][a-z0-9_-]*$/,
      "Use lowercase letters, numbers, underscores, or hyphens.",
    ),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
}).superRefine((values, context) => {
  if (values.password !== values.confirmPassword) {
    context.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    });
  }
});

export type AuthFieldErrors = Record<string, string>;

export type AuthActionResult =
  | { ok: true; status: "authenticated" | "confirmation_required" }
  | { ok: false; message: string; fieldErrors?: AuthFieldErrors };

export function safeInternalReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_RETURN_PATH;
  }

  try {
    const url = new URL(value, "http://constellary.local");
    if (url.origin !== "http://constellary.local") return DEFAULT_AUTH_RETURN_PATH;
    if (url.pathname === "/branches/new") return DEFAULT_AUTH_RETURN_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_RETURN_PATH;
  }
}

export function fieldErrors(error: z.ZodError): AuthFieldErrors {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
}
