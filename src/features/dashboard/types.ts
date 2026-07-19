import type { Enums } from "@/types/database";

export type DashboardCapabilities = {
  canEdit: boolean;
  canManage: boolean;
};

export type DashboardBranch = {
  id: string;
  title: string;
  parentId: string | null;
  parentTitle: string | null;
  summary: string | null;
  status: Enums<"branch_status">;
  privacy: Enums<"privacy_level">;
  updatedAt: string;
  collaboratorCount: number;
  commentCount: number;
  linkedBranchCount: number;
  sourceFileCount: number;
  childCount: number;
  capabilities: DashboardCapabilities;
};

export type DashboardDraft = {
  id: string;
  title: string;
  parentId: string | null;
  parentTitle: string | null;
  updatedAt: string;
  currentStep: string;
};

export type DashboardActivity = {
  id: string;
  label: string;
  branchId: string;
  branchTitle: string;
  actorName: string | null;
  createdAt: string;
};

export type ArchiveFilters = {
  query?: string;
  status?: string;
  privacy?: string;
  year?: string;
  month?: string;
  relationship?: string;
};

export type DashboardData = {
  profile: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    headline: string | null;
    bio: string | null;
    focusTags: string[];
    canEdit: boolean;
    counts: {
      accessibleBranches: number;
      collaborators: number;
      linkedBranches: number;
    };
  };
  drafts: DashboardDraft[];
  recentBranches: Pick<DashboardBranch, "id" | "title" | "parentTitle">[];
  featuredBranches: DashboardBranch[];
  archive: DashboardBranch[];
  activity: DashboardActivity[];
};
