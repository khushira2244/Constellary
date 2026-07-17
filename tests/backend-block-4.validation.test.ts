import { describe, expect, test } from "vitest";

import { contributionTypeMap } from "@/features/ai-contributions/types";
import { addBranchCollaborator, addLinkedBranch } from "@/features/branch-management/services";
import { addComment } from "@/features/discussions/services";
import { createFileUploadIntent } from "@/features/files/services";
import { createSource } from "@/features/sources/services";
import { createVisualSummaryItem } from "@/features/workspace/services";
import type { AppSupabaseClient } from "@/types/database";

const unusedClient = null as unknown as AppSupabaseClient;
const id = "d4000000-0000-4000-8000-000000000001";

describe("Backend Block 4 validation and locked rules", () => {
  test("rejects self-links before performing database writes", async () => {
    const result = await addLinkedBranch(id, id, "references", null, unusedClient);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects silent owner assignment", async () => {
    const result = await addBranchCollaborator(
      id,
      "d4000000-0000-4000-8000-000000000002",
      "owner" as "viewer",
      unusedClient,
    );
    expect(result.ok).toBe(false);
  });

  test("rejects invalid source URLs and missing provenance locators", async () => {
    const invalidUrl = await createSource(id, {
      sourceType: "website",
      title: "Bad URL",
      url: "not a url",
    }, unusedClient);
    expect(invalidUrl.ok).toBe(false);

    const noLocator = await createSource(id, {
      sourceType: "paper",
      title: "No locator",
    }, unusedClient);
    expect(noLocator.ok).toBe(false);
  });

  test("rejects unsafe file metadata before creating signed intents", async () => {
    const badName = await createFileUploadIntent(id, {
      fileName: "../secret.pdf",
      mimeType: "application/pdf",
      fileSize: 20,
    }, unusedClient);
    expect(badName.ok).toBe(false);

    const oversized = await createFileUploadIntent(id, {
      fileName: "paper.pdf",
      mimeType: "application/pdf",
      fileSize: 51 * 1024 * 1024,
    }, unusedClient);
    expect(oversized.ok).toBe(false);
  });

  test("rejects empty comments and malformed visual summaries", async () => {
    expect((await addComment(id, " ", undefined, unusedClient)).ok).toBe(false);
    expect((await createVisualSummaryItem(
      id,
      null as never,
      unusedClient,
    )).ok).toBe(false);
  });

  test("maps every product AI workflow to an attributed database enum", () => {
    expect(contributionTypeMap).toEqual({
      full_summary_draft: "summary_draft",
      linked_branch_context_summary: "summary_expansion",
      next_direction_suggestion: "idea_suggestion",
      reference_suggestion: "reference_suggestion",
      visual_summary_structure: "visual_summary_suggestion",
      rough_note_clarification: "rewrite",
    });
  });
});
