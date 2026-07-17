import { describe, expect, test } from "vitest";

import {
  DEFAULT_AUTH_RETURN_PATH,
  loginSchema,
  safeInternalReturnPath,
  signupSchema,
} from "@/features/auth/model";

describe("frontend authentication validation", () => {
  test("accepts valid login credentials without transforming the password", () => {
    expect(loginSchema.parse({
      email: " researcher@example.com ",
      password: "Exact Password!",
    })).toEqual({
      email: "researcher@example.com",
      password: "Exact Password!",
    });
  });

  test("normalizes usernames and rejects invalid signup fields", () => {
    const valid = signupSchema.parse({
      displayName: "Ada Researcher",
      username: "Ada_Research",
      email: "ada@example.com",
      password: "strong-password",
      confirmPassword: "strong-password",
    });
    expect(valid.username).toBe("ada_research");

    expect(signupSchema.safeParse({
      ...valid,
      username: "bad username",
      confirmPassword: "different-password",
    }).success).toBe(false);
  });

  test("preserves internal return paths including query strings", () => {
    expect(safeInternalReturnPath("/branches/drafts/abc/workspace?step=2")).toBe(
      "/branches/drafts/abc/workspace?step=2",
    );
  });

  test("rejects external, protocol-relative, and missing return paths", () => {
    expect(safeInternalReturnPath("https://evil.example/path")).toBe(DEFAULT_AUTH_RETURN_PATH);
    expect(safeInternalReturnPath("//evil.example/path")).toBe(DEFAULT_AUTH_RETURN_PATH);
    expect(safeInternalReturnPath(null)).toBe(DEFAULT_AUTH_RETURN_PATH);
  });
});
