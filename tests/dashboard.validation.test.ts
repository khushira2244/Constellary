import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  activityLabel,
  currentDraftStep,
  safeArchiveFilters,
} from "@/features/dashboard/model";

describe("Home dashboard model", () => {
  test("uses readable activity labels without exposing event metadata", () => {
    expect(activityLabel("branch_confirmed")).toBe("Confirmed a branch");
    expect(activityLabel("ai_content_approved")).toBe("Approved an AI contribution");
    expect(activityLabel("unknown_internal_event")).toBe("Updated research");
  });

  test("finds the first incomplete creation step", () => {
    expect(currentDraftStep({ title: true, originalIdea: true })).toBe("Origin");
    expect(currentDraftStep({})).toBe("Title");
    expect(currentDraftStep({
      title: true,
      originalIdea: true,
      origin: true,
      shortSummary: true,
      previousWork: true,
      people: true,
      privacyAndAI: true,
    })).toBe("Review");
  });

  test("normalizes server archive filters and bounds title search", () => {
    const filters = safeArchiveFilters({
      q: `  ${"memory".repeat(30)}  `,
      status: ["testing", "active"],
      privacy: "private",
      year: "2026",
      month: "7",
      relationship: "subbranch",
    });
    expect(filters.query).toHaveLength(100);
    expect(filters).toMatchObject({
      status: "testing",
      privacy: "private",
      year: "2026",
      month: "7",
      relationship: "subbranch",
    });
  });
});

describe("Create versus Resume route regression", () => {
  const project = process.cwd();

  test("GET /branches/new does not create or resume a draft", () => {
    const source = readFileSync(resolve(project, "src/app/branches/new/page.tsx"), "utf8");
    expect(source).not.toContain("createMainBranchDraft");
    expect(source).not.toContain("getLatestEditableMainBranchDraft");
    expect(source).not.toContain("redirect(");
  });

  test("Create Branch is an explicit server action that creates a fresh draft", () => {
    const source = readFileSync(resolve(project, "src/app/dashboard-actions.ts"), "utf8");
    expect(source).toContain('"use server"');
    expect(source).toContain("createMainBranchDraft(client)");
    expect(source).toContain("/branches/drafts/${created.data.id}/workspace");
  });

  test("Resume points to the selected draft id", () => {
    const source = readFileSync(resolve(project, "src/app/page.tsx"), "utf8");
    expect(source).toContain("/branches/drafts/${draft.id}/workspace");
    expect(source).toContain("<DeleteDraftForm draftId={draft.id}");
  });

  test("archive filters remain server query constraints", () => {
    const source = readFileSync(resolve(project, "src/features/dashboard/services.ts"), "utf8");
    expect(source).toContain('.ilike("title"');
    expect(source).toContain('branchesQuery.eq(');
    expect(source).toContain('.gte("updated_at"');
    expect(source).toContain('.is("parent_branch_id", null)');
  });
});
