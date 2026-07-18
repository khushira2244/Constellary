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

export type DashboardOverview = {
  mainBranches: number;
  totalBranches: number;
  collaborators: number;
  linkedBranches: number;
  unfinishedDrafts: number;
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
  profileName: string;
  overview: DashboardOverview;
  featured: DashboardBranch | null;
  recent: DashboardBranch[];
  drafts: DashboardDraft[];
  archive: DashboardBranch[];
  activity: DashboardActivity[];
};
