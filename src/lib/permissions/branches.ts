import { requireCurrentUser } from "@/lib/auth/current-user";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Branch } from "@/types/database";

export type BranchAccess = "view" | "edit" | "manage" | "comment";

const permissionFunction = {
  view: "can_view_branch",
  edit: "can_edit_branch",
  manage: "can_manage_branch",
  comment: "can_comment_branch",
} as const;

export async function canUserAccessBranch(
  branchId: string,
  access: BranchAccess = "view",
  client?: AppSupabaseClient,
): Promise<ServiceResult<boolean>> {
  if (!client) {
    return fail("CONFIGURATION_ERROR", "An authenticated Supabase client is required.");
  }
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;

  const { data, error } = await client.rpc(permissionFunction[access], {
    requested_branch_id: branchId,
    requested_user_id: user.data.id,
  });
  if (error) return databaseFailure(error.message);
  return ok(Boolean(data));
}

export async function requireBranchAccess(
  branchId: string,
  access: BranchAccess = "view",
  client?: AppSupabaseClient,
): Promise<ServiceResult<Branch>> {
  if (!client) {
    return fail("CONFIGURATION_ERROR", "An authenticated Supabase client is required.");
  }
  const allowed = await canUserAccessBranch(branchId, access, client);
  if (!allowed.ok) return allowed;
  if (!allowed.data) return fail("FORBIDDEN", `You do not have ${access} access to this branch.`);

  const { data, error } = await client
    .from("branches")
    .select("*")
    .eq("id", branchId)
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("NOT_FOUND", "Branch not found.");
  return ok(data);
}
