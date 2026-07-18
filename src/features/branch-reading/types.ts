import type { Enums, Json, Tables } from "@/types/database";

export type BranchBasicInfo = Pick<
  Tables<"branches">,
  "id" | "title" | "owner_id" | "parent_branch_id" | "privacy" | "status" | "updated_at"
>;

export type BranchPathItem = Pick<
  Tables<"branches">,
  "id" | "title" | "parent_branch_id" | "privacy" | "status"
>;

export type LinkedBranchView = {
  linkId: string;
  direction: "outgoing" | "incoming";
  relationshipType: Enums<"branch_relationship_type">;
  relationshipNote: string | null;
  branch: BranchBasicInfo;
  importedSummaryId: string | null;
};

export type BranchSummaryView = Pick<
  Tables<"branch_summaries">,
  | "id"
  | "branch_id"
  | "summary_type"
  | "content"
  | "status"
  | "visibility"
  | "created_by"
  | "approved_by"
  | "approved_at"
  | "is_current"
  | "updated_at"
>;

export type BranchFileView = Pick<
  Tables<"files">,
  | "id"
  | "branch_id"
  | "workspace_item_id"
  | "file_name"
  | "file_size"
  | "mime_type"
  | "uploaded_by"
  | "visibility"
  | "created_at"
>;

export type PublicProfile = Pick<
  Tables<"profiles">,
  "id" | "display_name" | "username" | "avatar_url" | "headline" | "is_verified"
>;

export type BranchCollaboratorView = {
  id: string;
  userId: string;
  role: Enums<"collaborator_role">;
  accessScope: Enums<"access_scope">;
  profile: PublicProfile | null;
};

export type BranchCapabilities = {
  authenticated: boolean;
  role: Enums<"collaborator_role"> | null;
  accessScope: Enums<"access_scope"> | null;
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  canComment: boolean;
};

export type BranchPrivacyAndStatus = Pick<
  Tables<"branches">,
  "privacy" | "status" | "archived_at" | "updated_at"
>;

export type BranchPageData = {
  branch: Tables<"branches">;
  owner: PublicProfile | null;
  path: BranchPathItem[];
  parent: BranchBasicInfo | null;
  children: BranchBasicInfo[];
  linkedBranches: LinkedBranchView[];
  shortSummary: BranchSummaryView | null;
  fullSummary: BranchSummaryView | null;
  notes: Tables<"workspace_items">[];
  sources: Tables<"sources">[];
  files: BranchFileView[];
  comments: Tables<"comments">[];
  collaborators: BranchCollaboratorView[];
  aiAttribution: Tables<"ai_contributions">[];
  activity: Tables<"activity_events">[];
  privacyAndStatus: BranchPrivacyAndStatus;
  capabilities: BranchCapabilities;
};

export type BranchWorkspaceNavigationData = {
  branch: BranchBasicInfo;
  path: BranchPathItem[];
  parent: BranchBasicInfo | null;
  children: BranchBasicInfo[];
  linkedBranches: LinkedBranchView[];
  capabilities: BranchCapabilities;
};

export type PublicBranchView = Omit<
  BranchPageData,
  "collaborators" | "aiAttribution"
> & {
  collaborators: [];
  aiAttribution: [];
  capabilities: BranchCapabilities & {
    authenticated: false;
    canEdit: false;
    canManage: false;
    canComment: false;
  };
};

export type EditableBranchView = BranchPageData & {
  capabilities: BranchCapabilities & { canEdit: true };
};

export type BranchTreeNode = {
  data: BranchPageData;
  children: BranchTreeNode[];
};

export type QueryFailure = { message: string; details?: string; hint?: string; code?: string };
export type JsonObject = Record<string, Json>;
