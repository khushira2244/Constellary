import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const workspace = readFileSync(
  "src/app/branches/[branchId]/workspace/editing-workspace.tsx",
  "utf8",
);
const assistantService = readFileSync(
  "src/features/ai-assistant/services.ts",
  "utf8",
);
const contributionService = readFileSync(
  "src/features/ai-contributions/services.ts",
  "utf8",
);
const actions = readFileSync(
  "src/app/branches/[branchId]/workspace/actions.ts",
  "utf8",
);

describe("Workspace GPT-5.6 demo flow", () => {
  test("adds one active item without duplicates and exposes removal and Clear", () => {
    expect(workspace).toContain("current.includes(active) ? current : [...current, active]");
    expect(workspace).toContain("Add active item to AI context");
    expect(workspace).toContain("onRemove");
    expect(workspace).toContain("onClear={() => setContext([])}");
  });

  test("blocks empty context and keeps the focused Full Summary request", () => {
    expect(workspace).toContain("Add a Workspace item to AI context before asking GPT-5.6.");
    expect(workspace).toContain('contributionKind: "full_summary_draft"');
    expect(workspace).toContain("Ask GPT-5.6 about the selected research context...");
    expect(assistantService).toContain("Save a Full Summary before adding it to AI context.");
  });

  test("derives exact-branch context and edit permissions on the server", () => {
    expect(assistantService).toContain("getBranchPageData(input.branchId, client)");
    expect(assistantService).toContain('requireBranchAccess(branchId, "edit", client)');
    expect(assistantService).toContain('role !== "owner" && role !== "editor"');
    expect(assistantService).toContain("AI access is not enabled for this account.");
  });

  test("keeps generation, approval, rejection, and application separate", () => {
    expect(workspace).toContain('status: "generated"');
    expect(actions).toContain("approveAIContributionAction");
    expect(actions).toContain("rejectAIContributionAction");
    expect(workspace).toContain('applyAIContributionAction(branchId, response.id, "full_summary")');
    expect(workspace).toContain("Apply to Full Summary");
    expect(contributionService).toContain('approval_status !== "approved"');
  });

  test("applies only attributed content while confirmed provenance stays locked", () => {
    expect(contributionService).toContain('targetItemType === "full_summary"');
    expect(contributionService).toContain("ai_contribution_id: contributionId");
    expect(contributionService).toContain("created_by: user.data.id");
    expect(workspace).toContain('<LockedField label="Original Idea">');
    expect(workspace).toContain('<LockedField label="Title">');
    expect(workspace).toContain('<LockedField label="Parent branch">');
  });

  test("persists and renders model, user, status, timestamp, and activity history", () => {
    expect(contributionService).toContain("model_name:");
    expect(contributionService).toContain("requested_by: user.data.id");
    expect(contributionService).toContain('approval_status: "generated"');
    expect(contributionService).toContain('"ai_content_generated"');
    expect(contributionService).toContain('"ai_content_approved"');
    expect(workspace).toContain("history={data.aiAttribution}");
    expect(workspace).toContain("entry.approval_status");
    expect(workspace).toContain("entry.created_at");
  });
});
