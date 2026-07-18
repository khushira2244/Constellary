import { uuidSchema } from "@/features/branch-drafts/schemas";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Branch, Tables } from "@/types/database";
import {
  readActivity,
  readAI,
  readBasicBranch,
  readBranch,
  readChildren,
  readCollaborators,
  readComments,
  readFiles,
  readLinks,
  readNotes,
  readOwner,
  readPath,
  readSources,
  readSummary,
} from "./repository";
import type {
  BranchBasicInfo,
  BranchCapabilities,
  BranchCollaboratorView,
  BranchFileView,
  BranchPageData,
  BranchPathItem,
  BranchPrivacyAndStatus,
  BranchSummaryView,
  BranchTreeNode,
  BranchWorkspaceNavigationData,
  EditableBranchView,
  LinkedBranchView,
  PublicBranchView,
} from "./types";

const validId = (branchId: string) => uuidSchema.safeParse(branchId).success;

async function optionalUser(client: AppSupabaseClient) {
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

async function requiredBranch(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<Branch>> {
  if (!validId(branchId)) return fail("VALIDATION_ERROR", "Invalid branch id.");
  const { data, error } = await readBranch(branchId, client);
  if (error) return databaseFailure(error.message);
  if (!data) return fail("NOT_FOUND", "Branch not found or is not accessible.");
  return ok(data);
}

const queryResult = <T>(
  data: T | null,
  error: { message: string } | null,
): ServiceResult<T> => {
  if (error) return databaseFailure(error.message);
  if (data === null) return fail("DATABASE_ERROR", "A branch read returned no data.");
  return ok(data);
};

async function capabilities(
  branch: Branch,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchCapabilities>> {
  const user = await optionalUser(client);
  if (!user) {
    return ok({
      authenticated: false,
      role: null,
      accessScope: null,
      canView: true,
      canEdit: false,
      canManage: false,
      canComment: false,
    });
  }
  const [view, edit, manage, comment, membership] = await Promise.all([
    client.rpc("can_view_branch", { requested_branch_id: branch.id }),
    client.rpc("can_edit_branch", { requested_branch_id: branch.id }),
    client.rpc("can_manage_branch", { requested_branch_id: branch.id }),
    client.rpc("can_comment_branch", { requested_branch_id: branch.id }),
    client
      .from("branch_collaborators")
      .select("role,access_scope")
      .eq("branch_id", branch.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const error = view.error ?? edit.error ?? manage.error ?? comment.error ?? membership.error;
  if (error) return databaseFailure(error.message);
  return ok({
    authenticated: true,
    role: membership.data?.role ?? (branch.owner_id === user.id ? "owner" : null),
    accessScope:
      membership.data?.access_scope ?? (branch.owner_id === user.id ? "entire_branch" : null),
    canView: Boolean(view.data),
    canEdit: Boolean(edit.data),
    canManage: Boolean(manage.data),
    canComment: Boolean(comment.data),
  });
}

export const getBranch = requiredBranch;

export async function getBranchBasicInfo(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchBasicInfo>> {
  if (!validId(branchId)) return fail("VALIDATION_ERROR", "Invalid branch id.");
  const { data, error } = await readBasicBranch(branchId, client);
  if (error) return databaseFailure(error.message);
  if (!data) return fail("NOT_FOUND", "Branch not found or is not accessible.");
  return ok(data);
}

export async function getBranchPath(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchPathItem[]>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  const result = await readPath(branch.data, client);
  return queryResult(result.data, result.error);
}

export async function getParentBranch(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchBasicInfo | null>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  if (!branch.data.parent_branch_id) return ok(null);
  const { data, error } = await readBasicBranch(branch.data.parent_branch_id, client);
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function getChildBranches(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchBasicInfo[]>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  const result = await readChildren(branch.data.id, client);
  return queryResult(result.data, result.error);
}

export async function getLinkedBranches(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<LinkedBranchView[]>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  const result = await readLinks(branch.data.id, client);
  return queryResult(result.data, result.error);
}

async function summary(
  branchId: string,
  type: "short" | "full",
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchSummaryView | null>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  const user = await optionalUser(client);
  const result = await readSummary(branch.data.id, type, client, !user);
  if (result.error) return databaseFailure(result.error.message);
  return ok(result.data);
}

export const getBranchShortSummary = (
  branchId: string,
  client: AppSupabaseClient,
) => summary(branchId, "short", client);

export const getBranchFullSummary = (
  branchId: string,
  client: AppSupabaseClient,
) => summary(branchId, "full", client);

async function branchRows<T>(
  branchId: string,
  client: AppSupabaseClient,
  reader: (id: string, client: AppSupabaseClient) => Promise<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<ServiceResult<T[]>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  const result = await reader(branch.data.id, client);
  return queryResult(result.data, result.error);
}

export const getBranchNotes = (id: string, client: AppSupabaseClient) =>
  branchRows<Tables<"workspace_items">>(id, client, readNotes);
export const getBranchSources = (id: string, client: AppSupabaseClient) =>
  branchRows<Tables<"sources">>(id, client, readSources);
export const getBranchFiles = (id: string, client: AppSupabaseClient) =>
  branchRows<BranchFileView>(id, client, readFiles);
export const getBranchComments = (id: string, client: AppSupabaseClient) =>
  branchRows<Tables<"comments">>(id, client, readComments);
export const getBranchActivity = (id: string, client: AppSupabaseClient) =>
  branchRows<Tables<"activity_events">>(id, client, readActivity);

export async function getBranchCollaborators(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchCollaboratorView[]>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  if (!(await optionalUser(client))) return ok([]);
  const result = await readCollaborators(branch.data.id, client);
  return queryResult(result.data, result.error);
}

export async function getBranchAIAttribution(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<Tables<"ai_contributions">[]>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  if (!(await optionalUser(client))) return ok([]);
  const result = await readAI(branch.data.id, client);
  return queryResult(result.data, result.error);
}

export async function getBranchPrivacyAndStatus(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchPrivacyAndStatus>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  return ok({
    privacy: branch.data.privacy,
    status: branch.data.status,
    archived_at: branch.data.archived_at,
    updated_at: branch.data.updated_at,
  });
}

async function compose(
  branch: Branch,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchPageData>> {
  const user = await optionalUser(client);
  const [
    owner, path, parent, children, links, shortSummary, fullSummary,
    notes, sources, files, comments, collaborators, ai, activity, access,
  ] = await Promise.all([
    readOwner(branch.owner_id, client),
    readPath(branch, client),
    branch.parent_branch_id
      ? readBasicBranch(branch.parent_branch_id, client)
      : Promise.resolve({ data: null, error: null }),
    readChildren(branch.id, client),
    readLinks(branch.id, client),
    readSummary(branch.id, "short", client, !user),
    readSummary(branch.id, "full", client, !user),
    readNotes(branch.id, client),
    readSources(branch.id, client),
    readFiles(branch.id, client),
    readComments(branch.id, client),
    user ? readCollaborators(branch.id, client) : Promise.resolve({ data: [], error: null }),
    user ? readAI(branch.id, client) : Promise.resolve({ data: [], error: null }),
    readActivity(branch.id, client),
    capabilities(branch, client),
  ]);
  const errors = [
    owner.error, path.error, parent.error, children.error, links.error,
    shortSummary.error, fullSummary.error, notes.error, sources.error, files.error,
    comments.error, collaborators.error, ai.error, activity.error,
  ].filter(Boolean);
  if (errors[0]) return databaseFailure(errors[0].message);
  if (!access.ok) return access;
  return ok({
    branch,
    owner: owner.data,
    path: path.data ?? [],
    parent: parent.data,
    children: children.data ?? [],
    linkedBranches: links.data ?? [],
    shortSummary: shortSummary.data,
    fullSummary: fullSummary.data,
    notes: notes.data ?? [],
    sources: sources.data ?? [],
    files: files.data ?? [],
    comments: comments.data ?? [],
    collaborators: collaborators.data ?? [],
    aiAttribution: ai.data ?? [],
    activity: activity.data ?? [],
    privacyAndStatus: {
      privacy: branch.privacy,
      status: branch.status,
      archived_at: branch.archived_at,
      updated_at: branch.updated_at,
    },
    capabilities: access.data,
  });
}

export async function getBranchPageData(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchPageData>> {
  const branch = await requiredBranch(branchId, client);
  return branch.ok ? compose(branch.data, client) : branch;
}

export async function getBranchWorkspaceNavigationData(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchWorkspaceNavigationData>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  const [path, parent, children, links, access] = await Promise.all([
    readPath(branch.data, client),
    branch.data.parent_branch_id
      ? readBasicBranch(branch.data.parent_branch_id, client)
      : Promise.resolve({ data: null, error: null }),
    readChildren(branch.data.id, client),
    readLinks(branch.data.id, client),
    capabilities(branch.data, client),
  ]);
  const error = path.error ?? parent.error ?? children.error ?? links.error;
  if (error) return databaseFailure(error.message);
  if (!access.ok) return access;
  return ok({
    branch: {
      id: branch.data.id,
      title: branch.data.title,
      owner_id: branch.data.owner_id,
      parent_branch_id: branch.data.parent_branch_id,
      privacy: branch.data.privacy,
      status: branch.data.status,
      updated_at: branch.data.updated_at,
    },
    path: path.data ?? [],
    parent: parent.data,
    children: children.data ?? [],
    linkedBranches: links.data ?? [],
    capabilities: access.data,
  });
}

export async function getPublicBranchView(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<PublicBranchView>> {
  if (await optionalUser(client)) {
    return fail("VALIDATION_ERROR", "Public view requires an anonymous Supabase client.");
  }
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  if (branch.data.privacy !== "public") {
    return fail("NOT_FOUND", "Public branch not found.");
  }
  const data = await compose(branch.data, client);
  return data.ok ? ok(data.data as PublicBranchView) : data;
}

export async function getEditableBranchView(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<EditableBranchView>> {
  const branch = await requiredBranch(branchId, client);
  if (!branch.ok) return branch;
  const access = await capabilities(branch.data, client);
  if (!access.ok) return access;
  if (!access.data.canEdit) return fail("FORBIDDEN", "Edit access is required.");
  const data = await compose(branch.data, client);
  return data.ok ? ok(data.data as EditableBranchView) : data;
}

export async function getRootBranchId(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<string>> {
  const path = await getBranchPath(branchId, client);
  if (!path.ok) return path;
  const root = path.data[0];
  return root ? ok(root.id) : fail("NOT_FOUND", "The branch ancestry is unavailable.");
}

export async function getBranchTreePageData(
  rootBranchId: string,
  client: AppSupabaseClient,
  maximumBranches = 60,
): Promise<ServiceResult<BranchTreeNode>> {
  const root = await getBranchPageData(rootBranchId, client);
  if (!root.ok) return root;
  if (root.data.branch.parent_branch_id) {
    return fail("VALIDATION_ERROR", "Branch tree reads must start at a root branch.");
  }

  const visited = new Set<string>();
  let count = 0;
  async function build(data: BranchPageData): Promise<ServiceResult<BranchTreeNode>> {
    if (visited.has(data.branch.id)) {
      return fail("DATABASE_ERROR", "A cycle was detected in branch ancestry.");
    }
    if (++count > maximumBranches) {
      return fail("DATABASE_ERROR", "This branch tree is too large to render safely.");
    }
    visited.add(data.branch.id);
    const children: BranchTreeNode[] = [];
    for (const child of data.children) {
      const childData = await getBranchPageData(child.id, client);
      if (!childData.ok) return childData;
      const node = await build(childData.data);
      if (!node.ok) return node;
      children.push(node.data);
    }
    return ok({ data, children });
  }

  return build(root.data);
}
