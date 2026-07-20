import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("simplified collaboration and comments", () => {
  const view = read("src/app/branches/[branchId]/branch-view.tsx");
  const community = read("src/app/branches/[branchId]/community/page.tsx");
  const actions = read("src/app/branches/[branchId]/community/actions.ts");
  const comment = read("src/app/branches/[branchId]/community/comment-entry.tsx");
  const composer = read("src/app/branches/[branchId]/community/comment-composer.tsx");
  const migration = read("supabase/migrations/017_simple_collaboration_flow.sql");
  const css = read("src/app/globals.css");

  test("presents only Owner and Collaborator concepts without internal role labels", () => {
    expect(community).toContain("<h3>Owner</h3>");
    expect(community).toContain("<h3>Collaborators</h3>");
    expect(community).not.toContain("item.role");
    expect(view).not.toContain("collaborator.role");
    expect(view).not.toMatch(/Owner · Active|Collaborator · Active/);
  });

  test("owner invitation has one email and fixed internal editor access", () => {
    expect(community).toContain('data.capabilities.role === "owner"');
    expect(actions).toContain("create_simple_collaboration_invite");
    expect(migration).toContain("'editor'");
    expect(migration).toContain("'entire_branch'");
    expect(migration).toContain("The owner cannot invite themselves");
    expect(migration).toContain("already a collaborator");
    expect(migration).not.toContain("requested_role");
  });

  test("pending and active duplicates are prevented", () => {
    expect(migration).toContain("collaboration_invites");
    expect(read("supabase/migrations/005_collaboration.sql")).toContain("collaboration_invites_one_pending_email_idx");
    expect(migration).toContain("branch_collaborators");
  });

  test("only matching authenticated email accepts and acceptance is idempotent", () => {
    expect(migration).toContain("current_email <> lower(invite.invitee_email)");
    expect(migration).toContain("invite.status = 'accepted'");
    expect(migration).toContain("on conflict (branch_id, user_id)");
    expect(migration).toContain("status = 'accepted'");
  });

  test("comments can be created and only their author receives Edit", () => {
    expect(community).toContain("data.capabilities.canComment");
    expect(community).toContain("comment.author_id === user?.id");
    expect(comment).toContain("updateBranchCommentAction");
    expect(comment).toContain(">Edit</button>");
    expect(comment).not.toContain("Delete");
    expect(actions).not.toContain("deleteComment");
  });

  test("comment creation reports failures, refreshes both reads, and clears only after success", () => {
    expect(actions).toContain('revalidatePath(`/branches/${branchId}/community`)');
    expect(actions).toContain('revalidatePath(`/branches/${branchId}`)');
    expect(actions).toContain("result.error.message");
    expect(composer).toContain("if (result.ok)");
    expect(composer).toContain("formRef.current?.reset()");
    expect(composer).toContain("router.refresh()");
    expect(composer).toContain('role={isError ? "alert" : "status"}');
  });

  test("comment reads and previews stay scoped to the exact branch", () => {
    const repository = read("src/features/branch-reading/repository.ts");
    expect(repository).toContain('.from("comments")');
    expect(repository).toContain('.eq("branch_id", branchId)');
    expect(view).toContain("data.comments.slice(-3).reverse()");
    expect(view).toContain("<ProfileDot");
    expect(view).toContain("comment.created_at");
  });

  test("both previews target the exact branch community anchors", () => {
    expect(view).toContain("`/branches/${data.branch.id}/community#${section}`");
    expect(view).toContain("`/branches/${data.branch.id}/community#comments`");
    expect(view).toContain("`/branches/${data.branch.id}/community#collaborators`");
    expect(community).toContain('id="collaborators"');
    expect(community).toContain('id="comments"');
  });

  test("Workspace links are exact-branch, centered, and owner management stays separate", () => {
    expect(view).toContain("`/branches/${data.branch.id}/workspace?item=full-summary`");
    expect(view).toContain("`/branches/${data.branch.id}/workspace?item=ai-assistant`");
    expect(css).toContain("justify-content: center");
    expect(css).toContain("white-space: nowrap");
    expect(view).toContain("data.capabilities.canManage ? <PrivacyControl");
    expect(view).toContain('data.capabilities.role === "owner"');
  });
});
