"use server";

import { revalidatePath } from "next/cache";

import {
  addLinkedBranch,
  deleteConfirmedBranch,
  updateBranchPrivacy,
} from "@/features/branch-management/services";
import { searchAccessibleBranches } from "@/features/branch-links/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function searchBranchesAction(query: string) {
  const client = await createServerSupabaseClient();
  const result = await searchAccessibleBranches(query, client, 12);
  return result.ok
    ? { ok: true as const, data: result.data }
    : { ok: false as const, message: result.error.message };
}

export async function addLinkedBranchAction(branchId: string, targetBranchId: string) {
  const client = await createServerSupabaseClient();
  const result = await addLinkedBranch(
    branchId,
    targetBranchId,
    "references",
    null,
    client,
  );
  if (!result.ok) return { ok: false as const, message: result.error.message };
  revalidatePath(`/branches/${branchId}`);
  return { ok: true as const };
}

export async function deleteBranchAction(branchId: string) {
  const client = await createServerSupabaseClient();
  const result = await deleteConfirmedBranch(branchId, client);
  if (!result.ok) return { ok: false as const, message: result.error.message };
  return { ok: true as const };
}

export async function updateBranchPrivacyAction(
  branchId: string,
  privacy: "private" | "public",
) {
  const client = await createServerSupabaseClient();
  const result = await updateBranchPrivacy(branchId, privacy, client);
  if (!result.ok) return { ok: false as const, message: result.error.message };
  revalidatePath(`/branches/${branchId}`);
  return { ok: true as const, privacy: result.data.privacy };
}
