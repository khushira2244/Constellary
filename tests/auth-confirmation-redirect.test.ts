import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  emailConfirmationRedirectUrl,
  normalizedAppUrl,
} from "@/features/auth/urls";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("email confirmation redirects", () => {
  test("builds the production callback from the configured production origin", () => {
    expect(emailConfirmationRedirectUrl("https://constellary.vercel.app", "/")).toBe(
      "https://constellary.vercel.app/auth/callback",
    );
  });

  test("builds the local callback from the configured local origin", () => {
    expect(emailConfirmationRedirectUrl("http://localhost:3000", "/")).toBe(
      "http://localhost:3000/auth/callback",
    );
  });

  test("preserves safe internal returns and rejects external destinations", () => {
    expect(emailConfirmationRedirectUrl(
      "https://constellary.vercel.app",
      "/branches/example/workspace?item=notes",
    )).toContain("returnTo=%2Fbranches%2Fexample%2Fworkspace%3Fitem%3Dnotes");
    expect(emailConfirmationRedirectUrl(
      "https://constellary.vercel.app",
      "https://evil.example/steal",
    )).toBe("https://constellary.vercel.app/auth/callback");
  });

  test("requires HTTPS outside local development", () => {
    expect(() => normalizedAppUrl("http://constellary.vercel.app")).toThrow(/HTTPS/);
    expect(() => normalizedAppUrl("https://user:pass@constellary.vercel.app")).toThrow();
    expect(() => normalizedAppUrl("https://constellary.vercel.app/path")).toThrow();
  });

  test("signup explicitly supplies the callback and never hardcodes a production localhost", () => {
    const actions = read("src/app/(auth)/actions.ts");
    expect(actions).toContain("emailRedirectTo: emailConfirmationRedirectUrl(");
    expect(actions).toContain("process.env.NEXT_PUBLIC_APP_URL");
    expect(actions).not.toContain('emailRedirectTo: "http://localhost');
  });

  test("the callback exchanges the code and redirects only to a safe internal path", () => {
    const callback = read("src/app/auth/callback/route.ts");
    expect(callback).toContain("exchangeCodeForSession(code)");
    expect(callback).toContain("safeInternalReturnPath(");
    expect(callback).toContain("NextResponse.redirect(new URL(returnTo, request.url))");
    expect(callback).not.toContain("console.");
  });

  test("signed-in Home and existing login/signup routing remain intact", () => {
    const home = read("src/app/page.tsx");
    const actions = read("src/app/(auth)/actions.ts");
    expect(home).toContain("if (!auth.user) return <WelcomePage />");
    expect(home).toContain("getDashboardData(client, filters)");
    expect(actions.match(/redirect\(safeInternalReturnPath/g)).toHaveLength(2);
  });
});
