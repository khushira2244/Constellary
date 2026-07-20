"use server";

import { revalidatePath } from "next/cache";

import { addComment, updateComment } from "@/features/discussions/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function addBranchCommentAction(branchId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const client = await createServerSupabaseClient();
  const result = await addComment(branchId, content, undefined, client);
  if (result.ok) revalidatePath(`/branches/${branchId}/community`);
}

export async function inviteCollaboratorAction(branchId: string, email: string) {
  const client = await createServerSupabaseClient();
  const { error } = await client.rpc(
    "create_simple_collaboration_invite" as never,
    { requested_branch_id: branchId, requested_invitee_email: email } as never,
  );
  if (error) return { ok: false as const, message: error.message };
  revalidatePath(`/branches/${branchId}/community`);
  return { ok: true as const };
}

export async function updateBranchCommentAction(branchId: string, commentId: string, content: string) {
  const client = await createServerSupabaseClient();
  const result = await updateComment(commentId, content, client);
  if (result.ok) revalidatePath(`/branches/${branchId}/community`);
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, message: result.error.message };
}
