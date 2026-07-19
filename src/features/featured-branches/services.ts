import { uuidSchema } from "@/features/branch-drafts/schemas";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { canUserAccessBranch } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient } from "@/types/database";

export async function isBranchFeatured(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<boolean>> {
  if (!uuidSchema.safeParse(branchId).success) {
    return fail("VALIDATION_ERROR", "Invalid branch id.");
  }
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { data, error } = await client
    .from("featured_branches")
    .select("branch_id")
    .eq("user_id", user.data.id)
    .eq("branch_id", branchId)
    .maybeSingle();
  return error ? databaseFailure(error.message) : ok(Boolean(data));
}

export async function featureBranch(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<{ branchId: string; featured: true }>> {
  if (!uuidSchema.safeParse(branchId).success) {
    return fail("VALIDATION_ERROR", "Invalid branch id.");
  }
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const access = await canUserAccessBranch(branchId, "view", client);
  if (!access.ok) return access;
  if (!access.data) return fail("FORBIDDEN", "This branch is not accessible.");

  const { data: last, error: positionError } = await client
    .from("featured_branches")
    .select("position")
    .eq("user_id", user.data.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (positionError) return databaseFailure(positionError.message);

  const { error } = await client.from("featured_branches").upsert({
    user_id: user.data.id,
    branch_id: branchId,
    position: (last?.position ?? -1) + 1,
  }, { onConflict: "user_id,branch_id", ignoreDuplicates: true });
  return error
    ? databaseFailure(error.message)
    : ok({ branchId, featured: true as const });
}

export async function unfeatureBranch(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<{ branchId: string; featured: false }>> {
  if (!uuidSchema.safeParse(branchId).success) {
    return fail("VALIDATION_ERROR", "Invalid branch id.");
  }
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { error } = await client
    .from("featured_branches")
    .delete()
    .eq("user_id", user.data.id)
    .eq("branch_id", branchId);
  return error
    ? databaseFailure(error.message)
    : ok({ branchId, featured: false as const });
}
