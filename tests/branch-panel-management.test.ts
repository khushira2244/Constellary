import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Branch View panel management", () => {
  const view = read("src/app/branches/[branchId]/branch-view.tsx");
  const actions = read("src/app/branches/[branchId]/actions.ts");
  const workspacePage = read("src/app/branches/[branchId]/workspace/page.tsx");
  const workspace = read("src/app/branches/[branchId]/workspace/editing-workspace.tsx");
  const services = read("src/features/workspace/services.ts");

  test("removes whole-tree Edit View without removing the exact-branch Workspace", () => {
    expect(view).not.toContain("Edit View");
    expect(view).not.toContain("/edit");
    expect(existsSync(resolve(root, "src/app/branches/[branchId]/edit/page.tsx"))).toBe(false);
    expect(view).toContain("/workspace?item=full-summary");
  });

  test("summary editing is permission gated and changes summary content only", () => {
    expect(view).toContain("data.capabilities.canEdit && !editing");
    expect(view).toContain("Edit Summary");
    expect(view).toContain("saveBranchSummaryAction(data.branch.id");
    expect(actions).toContain("updateFullSummary(summaryId, content, client)");
    expect(actions).toContain("createFullSummary(branchId, content, client)");
    expect(services).toContain("Approved summaries are immutable; create a new version.");
    expect(view).not.toContain("saveBranchTitle");
  });

  test("Workspace opens the exact selected branch and safely resolves item queries", () => {
    expect(view).toContain("`/branches/${data.branch.id}/workspace?item=full-summary`");
    expect(view).toContain("`/branches/${data.branch.id}/workspace?item=ai-assistant`");
    expect(workspacePage).toContain('query.item === "full-summary"');
    expect(workspacePage).toContain('query.item === "ai-assistant"');
    expect(workspacePage).toContain('initialItem={initialItem}');
    expect(workspace).toContain("useState<Item>(initialItem)");
  });

  test("confirmed provenance remains locked in Workspace", () => {
    expect(workspace).toContain('label="Original Idea"');
    expect(workspace).toContain('label="Origin"');
    expect(workspace).toContain('label="Parent branch"');
    expect(workspace).toContain('label="Branch Topic"');
    expect(workspace).toContain('label="Why This Direction Exists"');
    expect(workspace).toContain('label="Title"');
  });

  test("links and notes use branch-scoped permission-checked services", () => {
    expect(actions).toContain("addLinkedBranch(");
    expect(actions).toContain("removeLinkedBranch(linkId, client)");
    expect(actions).toContain("createNote(branchId, content");
    expect(actions).toContain("updateNote(noteId, content");
    expect(actions).toContain("deleteWorkspaceItem(noteId, client)");
    expect(view).toContain('link.direction === "outgoing"');
    expect(view).toContain("data.capabilities.canEdit ? <div");
  });

  test("comments, collaborators, and AI actions retain their role boundaries", () => {
    expect(view).toContain("data.capabilities.canComment ? (");
    expect(view).toContain("Open collaborators &amp; comments");
    expect(view).toContain("data.capabilities.canEdit ? (");
    expect(view).toContain("Open AI Workspace");
  });

  test("existing read-view controls and provenance rendering remain", () => {
    expect(view).toContain("<FeatureBranchButton");
    expect(view).toContain("<ShareBranchControl");
    expect(view).toContain('aria-label="More branch actions"');
    expect(view).toContain('role="tablist"');
    expect(view).toContain("<OriginalIdeaBox");
    expect(view).toContain("connectorThickness");
  });
});
