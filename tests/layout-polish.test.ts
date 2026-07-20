import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("focused layout polish", () => {
  const branchView = read("src/app/branches/[branchId]/branch-view.tsx");
  const signup = read("src/app/(auth)/signup/signup-form.tsx");
  const css = read("src/app/globals.css");

  test("renders linked branches as wrapping tags with a compact accessible remove action", () => {
    expect(branchView).toContain('className="linked-tag-list"');
    expect(branchView).toContain('className="linked-branch-tag"');
    expect(branchView).toContain("Remove linked branch ${link.branch.title}");
    expect(branchView).toContain(">×</button>");
    expect(branchView).not.toContain('className="linked-preview-row"');
    expect(css).toContain("flex-wrap: wrap");
    expect(css).toContain(".linked-branch-tag button");
  });

  test("centers compact summary and Workspace actions without changing their destinations", () => {
    expect(branchView).toContain(">Edit Summary</button>");
    expect(branchView).toContain(">Open in Workspace</Link>");
    expect(branchView).toContain(">Open AI Workspace</Link>");
    expect(css).toContain(".panel-management-actions button, .panel-management-actions a");
    expect(css).toContain("justify-content: center");
    expect(css).toContain("white-space: nowrap");
  });

  test("stacks identity fields while preserving the password field grid", () => {
    expect(signup.match(/auth-field-grid auth-field-grid--identity/g)).toHaveLength(1);
    expect(signup.match(/className="auth-field-grid"/g)).toHaveLength(1);
    expect(css).toContain(".auth-field-grid--identity { grid-template-columns: 1fr; gap: 0; }");
    expect(css).toContain(".auth-field-grid { grid-template-columns: 1fr;");
  });
});
