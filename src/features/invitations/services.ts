import { z } from "zod";

import { collaboratorRoleSchema, emailSchema, uuidSchema } from "@/features/branch-drafts/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Tables } from "@/types/database";
import type {
  CollaboratorAccess,
  CreateInvitationInput,
  CreatedInvitation,
  InvitationRole,
} from "./types";

const accessScopeSchema = z.enum([
  "entire_branch",
  "selected_content",
  "summary_only",
  "custom",
]);

const tokenSchema = z.string().trim().min(32).max(512);

const parseCreatedInvitation = (value: unknown): ServiceResult<CreatedInvitation> => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return fail("DATABASE_ERROR", "Invitation creation returned invalid data.");
  }
  const item = value as Record<string, unknown>;
  if (
    typeof item.invitation_id !== "string" ||
    typeof item.branch_id !== "string" ||
    typeof item.email !== "string" ||
    typeof item.role !== "string" ||
    typeof item.access_scope !== "string" ||
    typeof item.token !== "string"
  ) {
    return fail("DATABASE_ERROR", "Invitation creation returned incomplete data.");
  }
  return ok({
    invitationId: item.invitation_id,
    branchId: item.branch_id,
    email: item.email,
    role: item.role as InvitationRole,
    accessScope: item.access_scope as CreatedInvitation["accessScope"],
    expiresAt: typeof item.expires_at === "string" ? item.expires_at : null,
    token: item.token,
  });
};

export async function createInvitation(
  input: CreateInvitationInput,
  client: AppSupabaseClient,
): Promise<ServiceResult<CreatedInvitation>> {
  const branchId = uuidSchema.safeParse(input.branchId);
  const email = emailSchema.safeParse(input.email);
  const role = collaboratorRoleSchema.safeParse(input.role);
  const accessScope = accessScopeSchema.safeParse(input.accessScope ?? "entire_branch");
  if (!branchId.success || !email.success || !role.success || !accessScope.success) {
    return fail("VALIDATION_ERROR", "Valid branch, email, role and access scope are required.");
  }
  if (input.expiresAt && Number.isNaN(Date.parse(input.expiresAt))) {
    return fail("VALIDATION_ERROR", "Invitation expiry must be a valid timestamp.");
  }
  const manager = await requireBranchAccess(branchId.data, "manage", client);
  if (!manager.ok) return manager;

  const { data, error } = await client.rpc("create_collaboration_invite", {
    requested_branch_id: branchId.data,
    requested_invitee_email: email.data,
    requested_role: role.data,
    requested_access_scope: accessScope.data,
    requested_expires_at: input.expiresAt ?? null,
  });
  if (error) return databaseFailure(error.message);
  return parseCreatedInvitation(data);
}

export async function acceptInvitation(
  rawToken: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<{ branchId: string }>> {
  const token = tokenSchema.safeParse(rawToken);
  if (!token.success) return fail("VALIDATION_ERROR", "Invitation token is invalid.");
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { data, error } = await client.rpc("accept_collaboration_invite", {
    invite_token: token.data,
  });
  if (error) return databaseFailure(error.message);
  return ok({ branchId: data });
}

export async function declineInvitation(
  rawToken: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<{ branchId: string }>> {
  const token = tokenSchema.safeParse(rawToken);
  if (!token.success) return fail("VALIDATION_ERROR", "Invitation token is invalid.");
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { data, error } = await client.rpc("decline_collaboration_invite", {
    invite_token: token.data,
  });
  if (error) return databaseFailure(error.message);
  return ok({ branchId: data });
}

export async function revokeInvitation(
  invitationId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<{ branchId: string }>> {
  const id = uuidSchema.safeParse(invitationId);
  if (!id.success) return fail("VALIDATION_ERROR", "Invitation id is invalid.");
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { data, error } = await client.rpc("revoke_collaboration_invite", {
    invitation_id: id.data,
  });
  if (error) return databaseFailure(error.message);
  return ok({ branchId: data });
}

export async function listBranchCollaborators(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<Tables<"branch_collaborators">[]>> {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const { data, error } = await client
    .from("branch_collaborators")
    .select("*")
    .eq("branch_id", branch.data.id)
    .order("created_at");
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function listPendingInvitations(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<
  Pick<
    Tables<"collaboration_invites">,
    | "id"
    | "branch_id"
    | "inviter_id"
    | "invitee_email"
    | "role"
    | "access_scope"
    | "status"
    | "expires_at"
    | "created_at"
  >[]
>> {
  const branch = await requireBranchAccess(branchId, "manage", client);
  if (!branch.ok) return branch;
  const { data, error } = await client
    .from("collaboration_invites")
    .select(
      "id,branch_id,inviter_id,invitee_email,role,access_scope,status,expires_at,created_at",
    )
    .eq("branch_id", branch.data.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function checkCollaboratorRoleAndAccess(
  branchId: string,
  client: AppSupabaseClient,
  requestedUserId?: string,
): Promise<ServiceResult<CollaboratorAccess>> {
  const current = await requireCurrentUser(client);
  if (!current.ok) return current;
  const userId = requestedUserId ?? current.data.id;
  if (userId !== current.data.id) {
    const manager = await requireBranchAccess(branchId, "manage", client);
    if (!manager.ok) return manager;
  } else {
    const viewer = await requireBranchAccess(branchId, "view", client);
    if (!viewer.ok) return viewer;
  }

  const { data: membership, error } = await client
    .from("branch_collaborators")
    .select("role,access_scope")
    .eq("branch_id", branchId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return databaseFailure(error.message);

  const [view, edit, manage, comment] = await Promise.all([
    client.rpc("can_view_branch", {
      requested_branch_id: branchId,
      requested_user_id: userId,
    }),
    client.rpc("can_edit_branch", {
      requested_branch_id: branchId,
      requested_user_id: userId,
    }),
    client.rpc("can_manage_branch", {
      requested_branch_id: branchId,
      requested_user_id: userId,
    }),
    client.rpc("can_comment_branch", {
      requested_branch_id: branchId,
      requested_user_id: userId,
    }),
  ]);
  const permissionError = view.error ?? edit.error ?? manage.error ?? comment.error;
  if (permissionError) return databaseFailure(permissionError.message);

  return ok({
    branchId,
    userId,
    role: membership?.role ?? null,
    accessScope: membership?.access_scope ?? null,
    canView: Boolean(view.data),
    canEdit: Boolean(edit.data),
    canManage: Boolean(manage.data),
    canComment: Boolean(comment.data),
  });
}
