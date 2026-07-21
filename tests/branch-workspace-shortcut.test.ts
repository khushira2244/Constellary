import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Branch View Workspace shortcut", () => {
  const view = read("src/app/branches/[branchId]/branch-view.tsx");
  const workspacePage = read("src/app/branches/[branchId]/workspace/page.tsx");
  const readingServices = read("src/features/branch-reading/services.ts");
  const workspace = read("src/app/branches/[branchId]/workspace/editing-workspace.tsx");
  const css = read("src/app/globals.css");

  test("uses the exact rendered branch capability and ID", () => {
    expect(view).toContain("data.capabilities.canEdit ? (");
    expect(view).toContain('aria-label="Open branch in Workspace"');
    expect(view).toContain('href={`/branches/${data.branch.id}/workspace`}');
    expect(view.match(/className="branch-workspace-shortcut"/g)).toHaveLength(1);
  });

  test("one shared recursive branch header covers main branches and subbranches", () => {
    expect(view).toContain("function BranchTreeItem");
    expect(view).toContain("<BranchTreeItem");
    expect(view).toContain("flattenBranchTree(tree)");
    expect(view).toContain("branches.map(({ node, depth })");
    expect(view).toContain('href={`/branches/${data.branch.id}/workspace`}');
  });

  test("owner and accepted editor capability is server-derived", () => {
    expect(readingServices).toContain('client.rpc("can_edit_branch"');
    expect(readingServices).toContain("canEdit: Boolean(edit.data)");
    expect(view).not.toContain("clientRole");
    expect(view).not.toContain("searchParams.role");
  });

  test("Workspace independently rejects users without exact-branch edit access", () => {
    expect(workspacePage).toContain("getEditableBranchView(branchId, client)");
    expect(readingServices).toContain('if (!access.data.canEdit) return fail("FORBIDDEN"');
    expect(workspacePage).toContain('title={branch.error.code === "FORBIDDEN" ? "Editing access required"');
  });

  test("status and existing header actions remain unchanged", () => {
    expect(view).toContain("● {branchStatusLabel(data.branch.status)}");
    expect(view.match(/className="branch-status"/g)).toHaveLength(1);
    expect(view).toContain("<FeatureBranchButton");
    expect(view).toContain("<ShareBranchControl");
    expect(view).toContain('aria-label="More branch actions"');
    expect(view).not.toContain(">New</");
  });

  test("locked provenance and owner-only controls remain protected", () => {
    expect(workspace).toContain('label="Original Idea"');
    expect(workspace).toContain('label="Title"');
    expect(workspace).toContain('label="Parent branch"');
    expect(workspace).toContain('label="Branch Topic"');
    expect(workspace).toContain('label="Why This Direction Exists"');
    expect(view).toContain('data.capabilities.role === "owner"');
    expect(view).toContain("data.capabilities.canManage ? <PrivacyControl");
  });

  test("shortcut is compact, centered, and keyboard visible", () => {
    expect(css).toContain(".branch-workspace-shortcut {");
    expect(css).toContain("flex: 0 0 34px");
    expect(css).toContain("justify-content: center");
    expect(css).toContain(".branch-workspace-shortcut:focus-visible");
    expect(css).toContain("white-space: nowrap");
  });
});
