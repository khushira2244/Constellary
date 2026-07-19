"use server";

import { revalidatePath } from "next/cache";

import { addComment, deleteComment, updateComment } from "@/features/discussions/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function addBranchCommentAction(branchId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const client = await createServerSupabaseClient();
  const result = await addComment(branchId, content, undefined, client);
  if (result.ok) revalidatePath(`/branches/${branchId}/community`);
}

export async function updateBranchCommentAction(branchId: string, commentId: string, content: string) {
  const client = await createServerSupabaseClient();
  const result = await updateComment(commentId, content, client);
  if (result.ok) revalidatePath(`/branches/${branchId}/community`);
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, message: result.error.message };
}

export async function deleteBranchCommentAction(branchId: string, commentId: string) {
  const client = await createServerSupabaseClient();
  const result = await deleteComment(commentId, client);
  if (result.ok) revalidatePath(`/branches/${branchId}/community`);
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, message: result.error.message };
}
