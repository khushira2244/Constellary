import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Branch View reading and sharing", () => {
  const view = read("src/app/branches/[branchId]/branch-view.tsx");
  const share = read("src/components/branches/share-branch-control.tsx");
  const services = read("src/features/branch-reading/services.ts");
  const repository = read("src/features/branch-reading/repository.ts");

  test("shares the canonical route without tokens and preserves private restrictions", () => {
    expect(share).toContain("`/branches/${branchId}`");
    expect(share).toContain("Anyone with this link can view this branch.");
    expect(share).toContain("Only the owner and authorized collaborators can open this link.");
    expect(share).toContain("Copy Restricted Link");
    expect(share).not.toMatch(/share.?token|secret.?token|password.?link/i);
  });

  test("privacy changes remain manager-only and public viewers lack mutation controls", () => {
    expect(view).toContain("data.capabilities.canManage ? <PrivacyControl");
    expect(view).toContain("data.capabilities.canEdit ? (");
    expect(view).toContain('data.capabilities.role === "owner"');
    expect(share).toContain("privacy !== \"public\" && canManage");
    expect(share).toContain("updateBranchPrivacyAction");
  });

  test("linked branches stay separate, directional, and permission filtered", () => {
    expect(repository).toContain('.from("branch_links")');
    expect(repository).toContain('.from("branches")');
    expect(repository).toContain('direction: outgoing ? "outgoing" : "incoming"');
    const readLinks = repository.split("export async function readLinks")[1]?.split("export async function readSummary")[0] ?? "";
    expect(readLinks).not.toContain("parent_branch_id:");
    expect(view).toContain("link.direction === \"outgoing\"");
  });

  test("public composition does not expose collaborator emails", () => {
    expect(services).toContain("user ? readCollaborators");
    expect(repository).toContain("id,display_name,username,avatar_url,headline,is_verified");
    expect(repository).not.toContain("invitee_email");
  });

  test("expand routes use the same RLS-aware composed read and remain read-only", () => {
    for (const route of ["links", "summary", "community"]) {
      const page = read(`src/app/branches/[branchId]/${route}/page.tsx`);
      expect(page).toContain("getBranchPageData(branchId, client)");
      expect(page).toContain("<BranchReadingPage");
    }
    const summary = read("src/app/branches/[branchId]/summary/page.tsx");
    expect(summary).not.toContain("textarea");
    expect(summary).not.toContain("textarea");
    expect(summary).not.toContain("updateBranch");
    expect(view).toContain("Open full linked branches view");
    expect(view).toContain("Open full summary");
    expect(view).toContain("Open collaborators and comments");
  });

  test("comments use existing permission-checked service", () => {
    const action = read("src/app/branches/[branchId]/community/actions.ts");
    const discussion = read("src/features/discussions/services.ts");
    expect(action).toContain("addComment(branchId, content, undefined, client)");
    expect(discussion).toContain('canUserAccessBranch(branchId, "comment", client)');
  });

  test("seeded relationships are deterministic and idempotent", () => {
    const seed = read("scripts/seed-demo.ts");
    expect(seed).toContain("Array.from({ length: 5 }");
    expect(seed).toContain('upsertRows("branch_links"');
    expect(seed).toContain('upsertRows("comments"');
    expect(seed).toContain("onConflict: \"id\"");
  });
});
