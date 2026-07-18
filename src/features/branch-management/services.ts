import { recordActivity } from "@/features/activity/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok } from "@/lib/services/result";
import type { AppSupabaseClient, Enums } from "@/types/database";
import type { EditableBranchSettings, PermanentCollaboratorRole } from "./types";

const allowedRoles = new Set(["editor", "reviewer", "commenter", "viewer"]);

export async function addLinkedBranch(
  branchId: string,
  targetBranchId: string,
  relationshipType: Enums<"branch_relationship_type">,
  note: string | null,
  client: AppSupabaseClient,
) {
  if (branchId === targetBranchId) return fail("VALIDATION_ERROR", "A branch cannot link to itself.");
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const source = await requireBranchAccess(branchId, "edit", client);
  if (!source.ok) return source;
  const target = await requireBranchAccess(targetBranchId, "view", client);
  if (!target.ok) return fail("NOT_FOUND", "Target branch is unavailable.");
  const duplicate = await client.from("branch_links").select("id")
    .eq("source_branch_id", branchId).eq("target_branch_id", targetBranchId).maybeSingle();
  if (duplicate.error) return databaseFailure(duplicate.error.message);
  if (duplicate.data) return fail("CONFLICT", "These branches are already linked.");
  const summary = await client.from("branch_summaries").select("id")
    .eq("branch_id", targetBranchId).eq("summary_type", "short")
    .eq("status", "approved").eq("is_current", true).maybeSingle();
  if (summary.error) return databaseFailure(summary.error.message);
  const result = await client.from("branch_links").insert({
    source_branch_id: branchId,
    target_branch_id: targetBranchId,
    relationship_type: relationshipType,
    relationship_note: note?.trim() || null,
    imported_summary_id: summary.data?.id ?? null,
    created_by: user.data.id,
  }).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(branchId, "branch_linked", { link_id: result.data.id, target_branch_id: targetBranchId }, client);
  return ok(result.data);
}

export async function updateLinkedBranchRelationship(
  linkId: string,
  relationshipType: Enums<"branch_relationship_type">,
  note: string | null,
  client: AppSupabaseClient,
) {
  const existing = await client.from("branch_links").select("*").eq("id", linkId).maybeSingle();
  if (existing.error) return databaseFailure(existing.error.message);
  if (!existing.data) return fail("NOT_FOUND", "Linked branch relationship not found.");
  const branch = await requireBranchAccess(existing.data.source_branch_id, "edit", client);
  if (!branch.ok) return branch;
  const result = await client.from("branch_links").update({
    relationship_type: relationshipType,
    relationship_note: note?.trim() || null,
  }).eq("id", linkId).select("*").single();
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function removeLinkedBranch(linkId: string, client: AppSupabaseClient) {
  const existing = await client.from("branch_links").select("*").eq("id", linkId).maybeSingle();
  if (existing.error) return databaseFailure(existing.error.message);
  if (!existing.data) return fail("NOT_FOUND", "Linked branch relationship not found.");
  const branch = await requireBranchAccess(existing.data.source_branch_id, "edit", client);
  if (!branch.ok) return branch;
  const result = await client.from("branch_links").delete().eq("id", linkId).select("id").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(existing.data.source_branch_id, "branch_unlinked", {
    link_id: linkId,
    target_branch_id: existing.data.target_branch_id,
  }, client);
  return ok(result.data);
}

export async function listManageableLinkedBranches(branchId: string, client: AppSupabaseClient) {
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  const result = await client.from("branch_links").select("*")
    .eq("source_branch_id", branchId).order("created_at");
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

async function manager(branchId: string, client: AppSupabaseClient) {
  return requireBranchAccess(branchId, "manage", client);
}

export async function addBranchCollaborator(
  branchId: string,
  userId: string,
  role: PermanentCollaboratorRole,
  client: AppSupabaseClient,
) {
  if (!allowedRoles.has(role)) return fail("VALIDATION_ERROR", "Owner role cannot be assigned.");
  const current = await requireCurrentUser(client);
  if (!current.ok) return current;
  const branch = await manager(branchId, client);
  if (!branch.ok) return branch;
  if (userId === branch.data.owner_id) return fail("CONFLICT", "Branch owner already has owner membership.");
  const profile = await client.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profile.error) return databaseFailure(profile.error.message);
  if (!profile.data) return fail("NOT_FOUND", "Collaborator profile not found.");
  const result = await client.from("branch_collaborators").insert({
    branch_id: branchId, user_id: userId, role, added_by: current.data.id,
  }).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(branchId, "collaborator_joined", { user_id: userId, role }, client);
  return ok(result.data);
}

export async function updateBranchCollaboratorRole(
  branchId: string,
  userId: string,
  role: PermanentCollaboratorRole,
  client: AppSupabaseClient,
) {
  if (!allowedRoles.has(role)) return fail("VALIDATION_ERROR", "Owner role cannot be assigned.");
  const branch = await manager(branchId, client);
  if (!branch.ok) return branch;
  if (userId === branch.data.owner_id) return fail("FORBIDDEN", "Owner role cannot be changed here.");
  const result = await client.from("branch_collaborators").update({ role })
    .eq("branch_id", branchId).eq("user_id", userId).neq("role", "owner")
    .select("*").maybeSingle();
  if (result.error) return databaseFailure(result.error.message);
  if (!result.data) return fail("NOT_FOUND", "Collaborator not found.");
  await recordActivity(branchId, "collaborator_joined", { user_id: userId, role, action: "role_changed" }, client);
  return ok(result.data);
}

export async function removeBranchCollaborator(
  branchId: string,
  userId: string,
  client: AppSupabaseClient,
) {
  const branch = await manager(branchId, client);
  if (!branch.ok) return branch;
  if (userId === branch.data.owner_id) return fail("FORBIDDEN", "Branch owner cannot be removed.");
  const result = await client.from("branch_collaborators").delete()
    .eq("branch_id", branchId).eq("user_id", userId).neq("role", "owner")
    .select("id").maybeSingle();
  if (result.error) return databaseFailure(result.error.message);
  if (!result.data) return fail("NOT_FOUND", "Collaborator not found.");
  await recordActivity(branchId, "collaborator_removed", { user_id: userId }, client);
  return ok(result.data);
}

export async function listManageableCollaborators(branchId: string, client: AppSupabaseClient) {
  const branch = await manager(branchId, client);
  if (!branch.ok) return branch;
  const result = await client.from("branch_collaborators").select("*")
    .eq("branch_id", branchId).order("created_at");
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function updateBranchPrivacy(
  branchId: string,
  privacy: Enums<"privacy_level">,
  client: AppSupabaseClient,
) {
  const branch = await manager(branchId, client);
  if (!branch.ok) return branch;
  const result = await client.from("branches").update({ privacy })
    .eq("id", branchId).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(branchId, "privacy_changed", { from: branch.data.privacy, to: privacy }, client);
  return ok(result.data);
}

export async function updateBranchStatus(
  branchId: string,
  status: Enums<"branch_status">,
  client: AppSupabaseClient,
) {
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  const result = await client.from("branches").update({ status })
    .eq("id", branchId).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(branchId, "status_changed", { from: branch.data.status, to: status }, client);
  return ok(result.data);
}

export async function updateBranchAIEnabledState(
  branchId: string,
  enabled: boolean,
  client: AppSupabaseClient,
) {
  const branch = await manager(branchId, client);
  if (!branch.ok) return branch;
  const result = await client.from("branches").update({ ai_enabled: enabled })
    .eq("id", branchId).select("id,privacy,status,ai_enabled,updated_at").single();
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function getEditableBranchSettings(
  branchId: string,
  client: AppSupabaseClient,
) {
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  const settings: EditableBranchSettings = {
    id: branch.data.id,
    privacy: branch.data.privacy,
    status: branch.data.status,
    ai_enabled: branch.data.ai_enabled,
    updated_at: branch.data.updated_at,
  };
  return ok(settings);
}

export async function deleteConfirmedBranch(
  branchId: string,
  client: AppSupabaseClient,
) {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const branch = await requireBranchAccess(branchId, "manage", client);
  if (!branch.ok) return branch;
  if (branch.data.owner_id !== user.data.id) {
    return fail("FORBIDDEN", "Only the branch owner can delete this branch.");
  }
  const result = await client
    .from("branches")
    .delete()
    .eq("id", branch.data.id)
    .eq("owner_id", user.data.id)
    .select("id")
    .maybeSingle();
  if (result.error) {
    if (result.error.code === "23503") {
      return fail(
        "CONFLICT",
        "This branch is preserved by confirmed-draft, descendant, or provenance references and cannot be deleted safely.",
      );
    }
    return databaseFailure(result.error.message);
  }
  if (!result.data) return fail("FORBIDDEN", "The branch could not be deleted.");
  return ok(result.data);
}
