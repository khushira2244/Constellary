"use server";

import { revalidatePath } from "next/cache";

import {
  featureBranch,
  unfeatureBranch,
} from "@/features/featured-branches/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function setBranchFeaturedAction(branchId: string, featured: boolean) {
  const client = await createServerSupabaseClient();
  const result = featured
    ? await featureBranch(branchId, client)
    : await unfeatureBranch(branchId, client);
  if (!result.ok) return { ok: false as const, message: result.error.message };
  revalidatePath("/");
  revalidatePath(`/branches/${branchId}`);
  return { ok: true as const, featured: result.data.featured };
}
