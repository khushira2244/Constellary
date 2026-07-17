import type { BranchDraft, Json } from "@/types/database";
import { fail, ok, type ServiceResult } from "@/lib/services/result";
import { relationshipTypeSchema, uuidSchema } from "@/features/branch-drafts/schemas";
import type {
  ConfirmationValidation,
  ConfirmationValidationIssue,
} from "./types";

const objectEntries = (value: Json) =>
  Array.isArray(value) ? value.filter((item): item is Record<string, Json> =>
    Boolean(item) && !Array.isArray(item) && typeof item === "object",
  ) : [];

export function validateRequiredDraftFields(
  draft: BranchDraft,
): ServiceResult<ConfirmationValidation> {
  const issues: ConfirmationValidationIssue[] = [];
  if (!draft.title?.trim()) issues.push({ field: "title", message: "Title is required." });
  if (!draft.original_idea?.trim()) {
    issues.push({ field: "original_idea", message: "Original idea is required." });
  }
  if (!draft.origin_type) {
    issues.push({ field: "origin_type", message: "Origin is required." });
  }
  if (!draft.short_summary?.trim()) {
    issues.push({ field: "short_summary", message: "Short summary is required." });
  }

  if (!Array.isArray(draft.linked_branches_data)) {
    issues.push({ field: "linked_branches_data", message: "Linked branches must be an array." });
  } else {
    const entries = objectEntries(draft.linked_branches_data);
    if (entries.length !== draft.linked_branches_data.length) {
      issues.push({ field: "linked_branches_data", message: "Every linked branch must be an object." });
    }
    const targets = new Set<string>();
    for (const entry of entries) {
      const target = entry.target_branch_id;
      const relationship = entry.relationship_type;
      if (typeof target !== "string" || !uuidSchema.safeParse(target).success) {
        issues.push({ field: "linked_branches_data", message: "A linked branch has an invalid target." });
      } else if (targets.has(target)) {
        issues.push({ field: "linked_branches_data", message: "The same branch cannot be linked twice." });
      } else {
        targets.add(target);
      }
      if (typeof relationship !== "string" || !relationshipTypeSchema.safeParse(relationship).success) {
        issues.push({ field: "linked_branches_data", message: "A linked branch has an invalid relationship." });
      }
    }
  }

  if (!Array.isArray(draft.collaborators_data)) {
    issues.push({ field: "collaborators_data", message: "Collaborators must be an array." });
  }
  if (!Array.isArray(draft.ai_role_data)) {
    issues.push({ field: "ai_role_data", message: "AI attribution must be an array." });
  }

  if (issues.length) {
    return fail(
      "VALIDATION_ERROR",
      issues.map((issue) => `${issue.field}: ${issue.message}`).join(" "),
    );
  }

  return ok({ draft, mode: draft.parent_branch_id ? "subbranch" : "main" });
}
