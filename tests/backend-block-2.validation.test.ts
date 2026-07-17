import { describe, expect, test } from "vitest";

import { validateRequiredDraftFields } from "@/features/branch-confirmation/validation";
import type { BranchDraft } from "@/types/database";

const completeDraft: BranchDraft = {
  id: "b2000000-0000-4000-8000-000000000010",
  creator_id: "b2000000-0000-4000-8000-000000000001",
  parent_branch_id: null,
  title: "A valid draft",
  original_idea: "An original research idea",
  origin_type: "own_idea",
  origin_details: {},
  short_summary: "A compact approved summary.",
  privacy: "private",
  language: "en",
  creation_progress: {},
  linked_branches_data: [],
  collaborators_data: [],
  ai_role_data: [],
  confirmed_branch_id: null,
  confirmed_at: null,
  created_at: "2026-07-17T00:00:00.000Z",
  updated_at: "2026-07-17T00:00:00.000Z",
};

describe("Backend Block 2 confirmation validation", () => {
  test("accepts complete main and subbranch drafts", () => {
    const main = validateRequiredDraftFields(completeDraft);
    expect(main.ok).toBe(true);
    if (main.ok) expect(main.data.mode).toBe("main");

    const subbranch = validateRequiredDraftFields({
      ...completeDraft,
      parent_branch_id: "b2000000-0000-4000-8000-000000000020",
    });
    expect(subbranch.ok).toBe(true);
    if (subbranch.ok) expect(subbranch.data.mode).toBe("subbranch");
  });

  test("rejects missing required fields and duplicate linked targets", () => {
    const invalid = validateRequiredDraftFields({
      ...completeDraft,
      title: " ",
      original_idea: null,
      origin_type: null,
      short_summary: "",
      linked_branches_data: [
        {
          target_branch_id: "b2000000-0000-4000-8000-000000000020",
          relationship_type: "references",
        },
        {
          target_branch_id: "b2000000-0000-4000-8000-000000000020",
          relationship_type: "supports",
        },
      ],
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe("VALIDATION_ERROR");
      expect(invalid.error.message).toContain("Title is required");
      expect(invalid.error.message).toContain("same branch cannot be linked twice");
    }
  });
});
