import { recordActivity } from "@/features/activity/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Json, Tables } from "@/types/database";
import type {
  CollaboratorNoteVisibility,
  VisualSummaryContent,
  VoiceNoteMetadata,
} from "./types";

const text = (value: string, label: string): ServiceResult<string> => {
  const normalized = value.trim();
  return normalized
    ? ok(normalized)
    : fail("VALIDATION_ERROR", `${label} cannot be empty.`);
};

const object = (value: unknown, label: string): ServiceResult<Json> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? ok(value as Json)
    : fail("VALIDATION_ERROR", `${label} must be a JSON object.`);

async function editableItem(itemId: string, client: AppSupabaseClient) {
  const { data, error } = await client
    .from("workspace_items")
    .select("*")
    .eq("id", itemId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("NOT_FOUND", "Workspace item not found.");
  const branch = await requireBranchAccess(data.branch_id, "edit", client);
  return branch.ok ? ok(data) : branch;
}

async function createItem(
  branchId: string,
  itemType: Tables<"workspace_items">["item_type"],
  content: Json,
  client: AppSupabaseClient,
  options?: {
    parentItemId?: string;
    visibility?: CollaboratorNoteVisibility;
    title?: string;
  },
) {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  if (options?.parentItemId) {
    const { data: parent, error } = await client
      .from("workspace_items")
      .select("id,branch_id")
      .eq("id", options.parentItemId)
      .maybeSingle();
    if (error) return databaseFailure(error.message);
    if (!parent || parent.branch_id !== branch.data.id) {
      return fail("VALIDATION_ERROR", "Parent Workspace item must belong to this branch.");
    }
  }
  const { data, error } = await client
    .from("workspace_items")
    .insert({
      branch_id: branch.data.id,
      parent_item_id: options?.parentItemId,
      item_type: itemType,
      title: options?.title,
      content,
      visibility: options?.visibility ?? "inherit",
      author_id: user.data.id,
    })
    .select("*")
    .single();
  if (error) return databaseFailure(error.message);
  await recordActivity(branch.data.id, "workspace_item_created", {
    item_id: data.id,
    item_type: data.item_type,
  }, client);
  return ok(data);
}

export async function getWorkspaceItems(branchId: string, client: AppSupabaseClient) {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const { data, error } = await client
    .from("workspace_items")
    .select("*")
    .eq("branch_id", branch.data.id)
    .is("deleted_at", null)
    .order("position");
  return error ? databaseFailure(error.message) : ok(data);
}

export async function createFullSummary(
  branchId: string,
  content: string,
  client: AppSupabaseClient,
) {
  const value = text(content, "Full summary");
  if (!value.ok) return value;
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  const { data: current, error: currentError } = await client
    .from("branch_summaries")
    .select("id")
    .eq("branch_id", branch.data.id)
    .eq("summary_type", "full")
    .eq("is_current", true)
    .maybeSingle();
  if (currentError) return databaseFailure(currentError.message);
  if (current) return fail("CONFLICT", "A current full summary already exists.");
  const { data, error } = await client
    .from("branch_summaries")
    .insert({
      branch_id: branch.data.id,
      summary_type: "full",
      content: value.data,
      status: "draft",
      created_by: user.data.id,
    })
    .select("*")
    .single();
  if (error) return databaseFailure(error.message);
  await recordActivity(branch.data.id, "summary_created", { summary_id: data.id }, client);
  return ok(data);
}

export async function updateFullSummary(
  summaryId: string,
  content: string,
  client: AppSupabaseClient,
) {
  const value = text(content, "Full summary");
  if (!value.ok) return value;
  const { data: existing, error } = await client
    .from("branch_summaries")
    .select("*")
    .eq("id", summaryId)
    .eq("summary_type", "full")
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!existing) return fail("NOT_FOUND", "Full summary not found.");
  const branch = await requireBranchAccess(existing.branch_id, "edit", client);
  if (!branch.ok) return branch;
  if (existing.status === "approved") {
    return fail("CONFLICT", "Approved summaries are immutable; create a new version.");
  }
  const updated = await client
    .from("branch_summaries")
    .update({ content: value.data })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (updated.error) return databaseFailure(updated.error.message);
  await recordActivity(existing.branch_id, "summary_updated", { summary_id: existing.id }, client);
  return ok(updated.data);
}

export const createNote = (
  branchId: string,
  content: string,
  parentItemId: string | undefined,
  client: AppSupabaseClient,
) => {
  const value = text(content, "Note");
  return value.ok
    ? createItem(branchId, "note", { text: value.data }, client, { parentItemId })
    : Promise.resolve(value);
};

export async function updateNote(noteId: string, content: string, client: AppSupabaseClient) {
  const value = text(content, "Note");
  if (!value.ok) return value;
  const item = await editableItem(noteId, client);
  if (!item.ok) return item;
  if (!["note", "collaborator_note"].includes(item.data.item_type)) {
    return fail("VALIDATION_ERROR", "Workspace item is not a note.");
  }
  const result = await client
    .from("workspace_items")
    .update({ content: { text: value.data } })
    .eq("id", item.data.id)
    .select("*")
    .single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(item.data.branch_id, "workspace_item_updated", {
    item_id: item.data.id,
    action: "updated",
  }, client);
  return ok(result.data);
}

export const createCollaboratorNote = (
  branchId: string,
  content: string,
  visibility: CollaboratorNoteVisibility,
  client: AppSupabaseClient,
) => {
  const value = text(content, "Collaborator note");
  return value.ok
    ? createItem(branchId, "collaborator_note", { text: value.data }, client, { visibility })
    : Promise.resolve(value);
};

export async function createVoiceNoteMetadata(
  branchId: string,
  metadata: VoiceNoteMetadata,
  client: AppSupabaseClient,
) {
  const value = object(metadata, "Voice note metadata");
  return value.ok
    ? createItem(branchId, "voice_note", { kind: "voice_note", metadata: value.data }, client)
    : value;
}

export async function updateVoiceNoteMetadata(
  itemId: string,
  metadata: VoiceNoteMetadata,
  client: AppSupabaseClient,
) {
  const value = object(metadata, "Voice note metadata");
  if (!value.ok) return value;
  const item = await editableItem(itemId, client);
  if (!item.ok) return item;
  if (item.data.item_type !== "voice_note") return fail("VALIDATION_ERROR", "Item is not a voice note.");
  const result = await client.from("workspace_items")
    .update({ content: { kind: "voice_note", metadata: value.data } })
    .eq("id", item.data.id).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(item.data.branch_id, "workspace_item_updated", { item_id: item.data.id }, client);
  return ok(result.data);
}

export async function createVisualSummaryItem(
  branchId: string,
  content: VisualSummaryContent,
  client: AppSupabaseClient,
) {
  const value = object(content, "Visual summary");
  return value.ok
    ? createItem(branchId, "note", { kind: "visual_summary", document: value.data }, client, {
        title: "Visual Summary",
      })
    : value;
}

export async function updateVisualSummaryItem(
  itemId: string,
  content: VisualSummaryContent,
  client: AppSupabaseClient,
) {
  const value = object(content, "Visual summary");
  if (!value.ok) return value;
  const item = await editableItem(itemId, client);
  if (!item.ok) return item;
  if (
    !item.data.content ||
    Array.isArray(item.data.content) ||
    typeof item.data.content !== "object" ||
    item.data.content.kind !== "visual_summary"
  ) return fail("VALIDATION_ERROR", "Item is not a visual summary.");
  const result = await client.from("workspace_items")
    .update({ content: { kind: "visual_summary", document: value.data } })
    .eq("id", item.data.id).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(item.data.branch_id, "workspace_item_updated", { item_id: item.data.id }, client);
  return ok(result.data);
}

export async function deleteWorkspaceItem(itemId: string, client: AppSupabaseClient) {
  const item = await editableItem(itemId, client);
  if (!item.ok) return item;
  const { data, error } = await client.from("workspace_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", item.data.id).select("*").single();
  if (error) return databaseFailure(error.message);
  await recordActivity(item.data.branch_id, "workspace_item_updated", {
    item_id: item.data.id,
    action: "removed",
  }, client);
  return ok(data);
}
