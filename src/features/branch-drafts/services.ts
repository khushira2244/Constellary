import type { ZodType } from "zod";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type {
  AppSupabaseClient,
  BranchDraft,
  Json,
  TablesUpdate,
  Enums,
} from "@/types/database";
import {
  nullableTextSchema,
  privacySchema,
  shortSummarySchema,
  titleSchema,
  uuidSchema,
} from "./schemas";
import type { DraftProgress, OriginUpdate } from "./types";

const parse = <T>(schema: ZodType<T>, value: unknown): ServiceResult<T> => {
  const parsed = schema.safeParse(value);
  return parsed.success
    ? ok(parsed.data)
    : fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid value.");
};

async function ownedDraft(
  draftId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchDraft>> {
  const id = parse(uuidSchema, draftId);
  if (!id.ok) return id;
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { data, error } = await client
    .from("branch_drafts")
    .select("*")
    .eq("id", id.data)
    .eq("creator_id", user.data.id)
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("NOT_FOUND", "Branch draft not found.");
  return ok(data);
}

async function editableDraft(
  draftId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchDraft>> {
  const draft = await ownedDraft(draftId, client);
  if (!draft.ok) return draft;
  if (draft.data.confirmed_branch_id) {
    return fail("CONFLICT", "Confirmed drafts are immutable.");
  }
  return draft;
}

async function updateDraft(
  draftId: string,
  values: TablesUpdate<"branch_drafts">,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchDraft>> {
  const draft = await editableDraft(draftId, client);
  if (!draft.ok) return draft;
  const { data, error } = await client
    .from("branch_drafts")
    .update(values)
    .eq("id", draft.data.id)
    .eq("creator_id", draft.data.creator_id)
    .is("confirmed_branch_id", null)
    .select("*")
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("CONFLICT", "The draft changed or was confirmed before this update.");
  return ok(data);
}

export async function createMainBranchDraft(
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchDraft>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { data, error } = await client
    .from("branch_drafts")
    .insert({ creator_id: user.data.id, parent_branch_id: null })
    .select("*")
    .single();
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function getLatestEditableMainBranchDraft(
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchDraft | null>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { data, error } = await client
    .from("branch_drafts")
    .select("*")
    .eq("creator_id", user.data.id)
    .is("parent_branch_id", null)
    .is("confirmed_branch_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function createSubbranchDraft(
  parentBranchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchDraft>> {
  const parentId = parse(uuidSchema, parentBranchId);
  if (!parentId.ok) return parentId;
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const parent = await requireBranchAccess(parentId.data, "view", client);
  if (!parent.ok) return parent;
  const { data, error } = await client
    .from("branch_drafts")
    .insert({ creator_id: user.data.id, parent_branch_id: parent.data.id })
    .select("*")
    .single();
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function getLatestEditableSubbranchDraft(
  parentBranchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchDraft | null>> {
  const parentId = parse(uuidSchema, parentBranchId);
  if (!parentId.ok) return parentId;
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const parent = await requireBranchAccess(parentId.data, "view", client);
  if (!parent.ok) return parent;
  const { data, error } = await client
    .from("branch_drafts")
    .select("*")
    .eq("creator_id", user.data.id)
    .eq("parent_branch_id", parent.data.id)
    .is("confirmed_branch_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export const getBranchDraft = ownedDraft;

export async function updateBranchDraftTitle(
  draftId: string,
  title: string | null,
  client: AppSupabaseClient,
) {
  const value = parse(titleSchema, title);
  return value.ok ? updateDraft(draftId, { title: value.data || null }, client) : value;
}

export async function updateBranchDraftOriginalIdea(
  draftId: string,
  originalIdea: string | null,
  client: AppSupabaseClient,
) {
  const value = parse(nullableTextSchema, originalIdea);
  return value.ok
    ? updateDraft(draftId, { original_idea: value.data || null }, client)
    : value;
}

export async function updateBranchDraftOrigin(
  draftId: string,
  origin: OriginUpdate,
  client: AppSupabaseClient,
) {
  if (
    origin.originDetails !== undefined &&
    (origin.originDetails === null ||
      Array.isArray(origin.originDetails) ||
      typeof origin.originDetails !== "object")
  ) {
    return fail("VALIDATION_ERROR", "Origin details must be a JSON object.");
  }
  return updateDraft(
    draftId,
    {
      origin_type: origin.originType,
      ...(origin.originDetails === undefined ? {} : { origin_details: origin.originDetails }),
    },
    client,
  );
}

export async function updateBranchDraftShortSummary(
  draftId: string,
  summary: string | null,
  client: AppSupabaseClient,
) {
  const value = parse(shortSummarySchema, summary);
  return value.ok
    ? updateDraft(draftId, { short_summary: value.data || null }, client)
    : value;
}

export async function updateBranchDraftPrivacy(
  draftId: string,
  privacy: Enums<"privacy_level">,
  client: AppSupabaseClient,
) {
  const value = parse(privacySchema, privacy);
  return value.ok ? updateDraft(draftId, { privacy: value.data }, client) : value;
}

export async function updateBranchDraftProgress(
  draftId: string,
  progress: DraftProgress,
  client: AppSupabaseClient,
) {
  if (
    !progress ||
    Array.isArray(progress) ||
    typeof progress !== "object" ||
    Object.values(progress).some((value) => typeof value !== "boolean")
  ) {
    return fail("VALIDATION_ERROR", "Creation progress must map step names to booleans.");
  }
  return updateDraft(draftId, { creation_progress: progress as Json }, client);
}

export async function deleteBranchDraft(
  draftId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<{ id: string }>> {
  const draft = await editableDraft(draftId, client);
  if (!draft.ok) return draft;
  const { data, error } = await client
    .from("branch_drafts")
    .delete()
    .eq("id", draft.data.id)
    .eq("creator_id", draft.data.creator_id)
    .is("confirmed_branch_id", null)
    .select("id")
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("CONFLICT", "The draft changed or was confirmed before deletion.");
  return ok(data);
}
