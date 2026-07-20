import { existsSync, readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const page = readFileSync("src/app/page.tsx", "utf8");
const welcome = readFileSync("src/components/welcome/welcome-page.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const proxy = readFileSync("src/proxy.ts", "utf8");

describe("public Constellary welcome page", () => {
  test("shows Welcome only to signed-out visitors and retains the authenticated dashboard", () => {
    expect(page).toContain("client.auth.getUser()");
    expect(page).toContain("if (!auth.user) return <WelcomePage />");
    expect(page).toContain("getDashboardData(client, filters)");
    expect(proxy).not.toContain('pathname === "/" ||');
  });

  test("preserves the approved message and existing auth routes", () => {
    for (const text of ["Where ideas", "GROW", "get shaped", "shared", "and linked", "through collaboration with people and AI.", "With proof."]) {
      expect(welcome).toContain(text);
    }
    expect(welcome).toContain('href="/login"');
    expect(welcome).toContain('href="/signup"');
  });

  test("uses the three supplied local planet assets and existing Home background", () => {
    for (const asset of ["planet-6.png", "planet-7.png", "planet-10.png"]) {
      expect(existsSync(`public/assets/planets/${asset}`)).toBe(true);
      expect(welcome).toContain(`/assets/planets/${asset}`);
    }
    expect(css).toContain('url("/constellary-home-space.webp")');
  });

  test("keeps the compact header, responsive layout, and reduced-motion support", () => {
    expect(welcome).toContain('className="welcome-header"');
    expect(css).toContain(".welcome-header {");
    expect(css).toContain("@media (max-width: 560px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
