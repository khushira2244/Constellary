import type { AppSupabaseClient, Branch, Tables } from "@/types/database";
import type {
  BranchCollaboratorView,
  BranchFileView,
  BranchPathItem,
  BranchSummaryView,
  LinkedBranchView,
  PublicProfile,
} from "./types";

export const branchBasicColumns =
  "id,title,owner_id,parent_branch_id,privacy,status,updated_at" as const;

export async function readBranch(branchId: string, client: AppSupabaseClient) {
  return client.from("branches").select("*").eq("id", branchId).maybeSingle();
}

export async function readBasicBranch(branchId: string, client: AppSupabaseClient) {
  return client
    .from("branches")
    .select(branchBasicColumns)
    .eq("id", branchId)
    .maybeSingle();
}

export async function readPath(branch: Branch, client: AppSupabaseClient) {
  const reversed: BranchPathItem[] = [{
    id: branch.id,
    title: branch.title,
    parent_branch_id: branch.parent_branch_id,
    privacy: branch.privacy,
    status: branch.status,
  }];
  const visited = new Set([branch.id]);
  let parentId = branch.parent_branch_id;
  while (parentId && !visited.has(parentId) && reversed.length < 100) {
    visited.add(parentId);
    const { data, error } = await client
      .from("branches")
      .select("id,title,parent_branch_id,privacy,status")
      .eq("id", parentId)
      .maybeSingle();
    if (error) return { data: null, error };
    if (!data) break;
    reversed.push(data);
    parentId = data.parent_branch_id;
  }
  return { data: reversed.reverse(), error: null };
}

export async function readChildren(branchId: string, client: AppSupabaseClient) {
  return client
    .from("branches")
    .select(branchBasicColumns)
    .eq("parent_branch_id", branchId)
    .order("updated_at", { ascending: false });
}

export async function readLinks(branchId: string, client: AppSupabaseClient) {
  const { data: links, error } = await client
    .from("branch_links")
    .select("*")
    .or(`source_branch_id.eq.${branchId},target_branch_id.eq.${branchId}`)
    .order("created_at", { ascending: false });
  if (error || !links) return { data: null, error };
  const ids = [...new Set(links.map((link) =>
    link.source_branch_id === branchId ? link.target_branch_id : link.source_branch_id,
  ))];
  if (!ids.length) return { data: [] as LinkedBranchView[], error: null };
  const { data: branches, error: branchError } = await client
    .from("branches")
    .select(branchBasicColumns)
    .in("id", ids);
  if (branchError || !branches) return { data: null, error: branchError };
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const result = links.flatMap((link): LinkedBranchView[] => {
    const outgoing = link.source_branch_id === branchId;
    const linkedId = outgoing ? link.target_branch_id : link.source_branch_id;
    const linked = byId.get(linkedId);
    return linked ? [{
      linkId: link.id,
      direction: outgoing ? "outgoing" : "incoming",
      relationshipType: link.relationship_type,
      relationshipNote: link.relationship_note,
      branch: linked,
      importedSummaryId: link.imported_summary_id,
    }] : [];
  });
  return { data: result, error: null };
}

export async function readSummary(
  branchId: string,
  type: "short" | "full",
  client: AppSupabaseClient,
  approvedOnly = false,
) {
  let query = client
    .from("branch_summaries")
    .select(
      "id,branch_id,summary_type,content,status,visibility,created_by,approved_by,approved_at,is_current,updated_at",
    )
    .eq("branch_id", branchId)
    .eq("summary_type", type)
    .eq("is_current", true);
  if (approvedOnly) query = query.eq("status", "approved");
  return query.maybeSingle() as unknown as Promise<{
    data: BranchSummaryView | null;
    error: { message: string } | null;
  }>;
}

export async function readNotes(branchId: string, client: AppSupabaseClient) {
  return client
    .from("workspace_items")
    .select("*")
    .eq("branch_id", branchId)
    .in("item_type", ["note", "collaborator_note"])
    .is("deleted_at", null)
    .order("position");
}

export async function readSources(branchId: string, client: AppSupabaseClient) {
  return client.from("sources").select("*").eq("branch_id", branchId).order("created_at");
}

export async function readFiles(branchId: string, client: AppSupabaseClient) {
  return client
    .from("files")
    .select(
      "id,branch_id,workspace_item_id,file_name,file_size,mime_type,uploaded_by,visibility,created_at",
    )
    .eq("branch_id", branchId)
    .is("deleted_at", null)
    .order("created_at") as unknown as Promise<{
      data: BranchFileView[] | null;
      error: { message: string } | null;
    }>;
}

export async function readComments(branchId: string, client: AppSupabaseClient) {
  return client
    .from("comments")
    .select("*")
    .eq("branch_id", branchId)
    .neq("status", "deleted")
    .is("deleted_at", null)
    .order("created_at");
}

export async function readCollaborators(branchId: string, client: AppSupabaseClient) {
  const { data: memberships, error } = await client
    .from("branch_collaborators")
    .select("id,user_id,role,access_scope")
    .eq("branch_id", branchId)
    .order("created_at");
  if (error || !memberships) return { data: null, error };
  const userIds = memberships.map((item) => item.user_id);
  const { data: profiles, error: profileError } = userIds.length
    ? await client
        .from("profiles")
        .select("id,display_name,username,avatar_url,headline,is_verified")
        .in("id", userIds)
    : { data: [] as PublicProfile[], error: null };
  if (profileError || !profiles) return { data: null, error: profileError };
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  return {
    data: memberships.map((item): BranchCollaboratorView => ({
      id: item.id,
      userId: item.user_id,
      role: item.role,
      accessScope: item.access_scope,
      profile: byId.get(item.user_id) ?? null,
    })),
    error: null,
  };
}

export async function readAI(branchId: string, client: AppSupabaseClient) {
  return client
    .from("ai_contributions")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });
}

export async function readActivity(branchId: string, client: AppSupabaseClient) {
  return client
    .from("activity_events")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .limit(100);
}

export async function readOwner(ownerId: string, client: AppSupabaseClient) {
  return client
    .from("profiles")
    .select("id,display_name,username,avatar_url,headline,is_verified")
    .eq("id", ownerId)
    .maybeSingle() as unknown as Promise<{
      data: PublicProfile | null;
      error: { message: string } | null;
    }>;
}

export type ReadingRows =
  | Tables<"workspace_items">
  | Tables<"sources">
  | Tables<"comments">
  | Tables<"ai_contributions">
  | Tables<"activity_events">;
