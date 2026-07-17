import type { Enums, Json } from "@/types/database";

export type AIContributionKind =
  | "full_summary_draft"
  | "linked_branch_context_summary"
  | "next_direction_suggestion"
  | "reference_suggestion"
  | "visual_summary_structure"
  | "rough_note_clarification";

export type AIApplicationTarget = "full_summary" | "note" | "visual_summary";

export type AIOutput = Json;

export const contributionTypeMap: Record<
  AIContributionKind,
  Enums<"ai_contribution_type">
> = {
  full_summary_draft: "summary_draft",
  linked_branch_context_summary: "summary_expansion",
  next_direction_suggestion: "idea_suggestion",
  reference_suggestion: "reference_suggestion",
  visual_summary_structure: "visual_summary_suggestion",
  rough_note_clarification: "rewrite",
};
