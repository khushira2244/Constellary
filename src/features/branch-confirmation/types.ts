import type { BranchDraft, Enums } from "@/types/database";

export type ConfirmationInvitation = {
  invite_id: string;
  email: string;
  token: string;
};

export type BranchConfirmationResult = {
  branchId: string;
  alreadyConfirmed: boolean;
  invitations: ConfirmationInvitation[];
};

export type ConfirmationValidation = {
  draft: BranchDraft;
  mode: "main" | "subbranch";
};

export type ConfirmationValidationIssue = {
  field:
    | "title"
    | "original_idea"
    | "origin_type"
    | "short_summary"
    | "linked_branches_data"
    | "collaborators_data"
    | "ai_role_data";
  message: string;
};

export type ConfirmationRelationship = Enums<"branch_relationship_type">;
