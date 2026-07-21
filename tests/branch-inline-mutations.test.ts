import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Branch View inline mutations", () => {
  const view = read("src/app/branches/[branchId]/branch-view.tsx");
  const actions = read("src/app/branches/[branchId]/actions.ts");
  const communityActions = read("src/app/branches/[branchId]/community/actions.ts");
  const composer = read("src/app/branches/[branchId]/community/comment-composer.tsx");
  const entry = read("src/app/branches/[branchId]/community/comment-entry.tsx");
  const thread = read("src/app/branches/[branchId]/community/comment-thread.tsx");

  test("summary updates after the first successful save without refreshing", () => {
    expect(actions).toContain("data: result.data");
    expect(view).toContain("setSummary(result.data)");
    expect(view).toContain("fullSummary: result.data");
    expect(view).not.toContain("window.location.reload");
  });

  test("notes add, edit, and delete update only the open panel", () => {
    expect(view).toContain("const [notes, setNotes] = useState(data.notes)");
    expect(view).toContain("notes.map((note) => note.id === result.data.id ? result.data : note)");
    expect(view).toContain("[...notes, result.data]");
    expect(view).toContain("notes.filter((item) => item.id !== result.data.id)");
  });

  test("comment creation and editing update the live thread without router refresh", () => {
    expect(communityActions).toContain("data: result.data");
    expect(composer).toContain("onAdded(result.data)");
    expect(entry).toContain("setSavedContent(result.data.content)");
    expect(thread).toContain("[...current, comment]");
    expect(composer).not.toContain("router.refresh");
    expect(entry).not.toContain("router.refresh");
  });

  test("linked chips and connector count use the returned accessible link state", () => {
    expect(actions).toContain("getLinkedBranches(branchId, client)");
    expect(view).toContain("const [links, setLinks] = useState(data.linkedBranches)");
    expect(view).toContain("[...links, result.data]");
    expect(view).toContain("links.filter((link) => link.linkId !== result.data.id)");
    expect(view).toContain("linkedBranches: next");
  });

  test("active tab, entered values, and layout remain stable on success or failure", () => {
    expect(view).toContain("const [open, setOpen]");
    expect(view).toContain("if (!result.ok)");
    expect(composer).toContain("value={content}");
    expect(composer.indexOf('setContent("")')).toBeGreaterThan(composer.indexOf("if (result.ok)"));
    expect(view).not.toContain("scrollTo(");
    expect(view).not.toContain("location.href");
  });

  test("revalidation remains cache-only and exact branch permissions stay in services", () => {
    expect(actions).toContain('revalidatePath(`/branches/${branchId}`)');
    expect(communityActions).toContain('revalidatePath(`/branches/${branchId}/community`)');
    expect(view).toContain("saveBranchSummaryAction(data.branch.id");
    expect(view).toContain("saveBranchNoteAction(data.branch.id");
  });
});
