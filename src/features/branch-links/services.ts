import { getBranchDraft } from "@/features/branch-drafts/services";
import type { DraftLinkedBranch } from "@/features/branch-drafts/types";
import { relationshipTypeSchema, uuidSchema } from "@/features/branch-drafts/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Json } from "@/types/database";
import type {
  AddDraftLinkedBranchInput,
  ApprovedShortSummary,
  BranchBasicInfo,
} from "./types";

const asLinks = (value: Json): ServiceResult<DraftLinkedBranch[]> => {
  if (!Array.isArray(value)) {
    return fail("DATABASE_ERROR", "Draft linked branch data is not an array.");
  }
  return ok(value as unknown as DraftLinkedBranch[]);
};

const editableLinks = async (draftId: string, client: AppSupabaseClient) => {
  const draft = await getBranchDraft(draftId, client);
  if (!draft.ok) return draft;
  if (draft.data.confirmed_branch_id) return fail("CONFLICT", "Confirmed drafts are immutable.");
  const links = asLinks(draft.data.linked_branches_data);
  if (!links.ok) return links;
  return ok({ draft: draft.data, links: links.data });
};

export async function searchAccessibleBranches(
  query: string,
  client: AppSupabaseClient,
  limit = 20,
): Promise<ServiceResult<BranchBasicInfo[]>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const normalized = query.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ");
  if (normalized.length < 2) return ok([]);
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const { data, error } = await client
    .from("branches")
    .select("id,title,owner_id,parent_branch_id,privacy,status")
    .ilike("title", `%${normalized}%`)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function getBranchBasicInfo(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchBasicInfo>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const id = uuidSchema.safeParse(branchId);
  if (!id.success) return fail("VALIDATION_ERROR", "Invalid branch id.");
  const { data, error } = await client
    .from("branches")
    .select("id,title,owner_id,parent_branch_id,privacy,status")
    .eq("id", id.data)
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("NOT_FOUND", "Branch not found or is not readable.");
  return ok(data);
}

export async function getApprovedShortSummaryForBranch(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<ApprovedShortSummary | null>> {
  const branch = await getBranchBasicInfo(branchId, client);
  if (!branch.ok) return branch;
  const { data, error } = await client
    .from("branch_summaries")
    .select("id,branch_id,content,approved_at")
    .eq("branch_id", branch.data.id)
    .eq("summary_type", "short")
    .eq("status", "approved")
    .eq("is_current", true)
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (data && !data.approved_at) {
    return fail("DATABASE_ERROR", "Approved summary is missing its approval timestamp.");
  }
  return ok(data as ApprovedShortSummary | null);
}

export async function getDraftLinkedBranches(
  draftId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<DraftLinkedBranch[]>> {
  const draft = await getBranchDraft(draftId, client);
  if (!draft.ok) return draft;
  return asLinks(draft.data.linked_branches_data);
}

export async function addDraftLinkedBranch(
  draftId: string,
  input: AddDraftLinkedBranchInput,
  client: AppSupabaseClient,
): Promise<ServiceResult<DraftLinkedBranch[]>> {
  const targetId = uuidSchema.safeParse(input.targetBranchId);
  const relationship = relationshipTypeSchema.safeParse(input.relationshipType);
  if (!targetId.success || !relationship.success) {
    return fail("VALIDATION_ERROR", "Invalid linked branch or relationship.");
  }
  const current = await editableLinks(draftId, client);
  if (!current.ok) return current;
  if (current.data.links.some((item) => item.target_branch_id === targetId.data)) {
    return fail("CONFLICT", "This branch is already linked to the draft.");
  }
  if (current.data.draft.confirmed_branch_id === targetId.data) {
    return fail("VALIDATION_ERROR", "A branch cannot link to itself.");
  }
  const branch = await getBranchBasicInfo(targetId.data, client);
  if (!branch.ok) return branch;
  const summary = await getApprovedShortSummaryForBranch(targetId.data, client);
  if (!summary.ok) return summary;

  const next: DraftLinkedBranch[] = [
    ...current.data.links,
    {
      target_branch_id: branch.data.id,
      relationship_type: relationship.data,
      relationship_note: input.relationshipNote?.trim() || null,
      snapshot: {
        title: branch.data.title,
        owner_id: branch.data.owner_id,
        privacy: branch.data.privacy,
        imported_at: new Date().toISOString(),
        approved_short_summary: summary.data
          ? {
              id: summary.data.id,
              content: summary.data.content,
              approved_at: summary.data.approved_at,
            }
          : null,
      },
    },
  ];
  const { data, error } = await client
    .from("branch_drafts")
    .update({ linked_branches_data: next as unknown as Json })
    .eq("id", current.data.draft.id)
    .eq("creator_id", current.data.draft.creator_id)
    .eq("updated_at", current.data.draft.updated_at)
    .is("confirmed_branch_id", null)
    .select("linked_branches_data")
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("CONFLICT", "The draft was changed concurrently.");
  return asLinks(data.linked_branches_data);
}

export async function removeDraftLinkedBranch(
  draftId: string,
  targetBranchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<DraftLinkedBranch[]>> {
  const targetId = uuidSchema.safeParse(targetBranchId);
  if (!targetId.success) return fail("VALIDATION_ERROR", "Invalid branch id.");
  const current = await editableLinks(draftId, client);
  if (!current.ok) return current;
  const next = current.data.links.filter((item) => item.target_branch_id !== targetId.data);
  if (next.length === current.data.links.length) {
    return fail("NOT_FOUND", "Linked branch not found in this draft.");
  }
  const { data, error } = await client
    .from("branch_drafts")
    .update({ linked_branches_data: next as unknown as Json })
    .eq("id", current.data.draft.id)
    .eq("creator_id", current.data.draft.creator_id)
    .eq("updated_at", current.data.draft.updated_at)
    .is("confirmed_branch_id", null)
    .select("linked_branches_data")
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("CONFLICT", "The draft was changed concurrently.");
  return asLinks(data.linked_branches_data);
}
