import type { Enums } from "@/types/database";

export type AddDraftLinkedBranchInput = {
  targetBranchId: string;
  relationshipType: Enums<"branch_relationship_type">;
  relationshipNote?: string | null;
};

export type BranchBasicInfo = {
  id: string;
  title: string;
  owner_id: string;
  parent_branch_id: string | null;
  privacy: Enums<"privacy_level">;
  status: Enums<"branch_status">;
};

export type ApprovedShortSummary = {
  id: string;
  branch_id: string;
  content: string;
  approved_at: string;
};
