import { recordActivity } from "@/features/activity/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { canUserAccessBranch, requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok } from "@/lib/services/result";
import type { AppSupabaseClient } from "@/types/database";

const validContent = (content: string) => {
  const value = content.trim();
  return value ? ok(value) : fail("VALIDATION_ERROR", "Comment cannot be empty.");
};

async function readableComment(commentId: string, client: AppSupabaseClient) {
  const result = await client.from("comments").select("*").eq("id", commentId).maybeSingle();
  if (result.error) return databaseFailure(result.error.message);
  return result.data ? ok(result.data) : fail("NOT_FOUND", "Comment not found.");
}

export async function addComment(
  branchId: string,
  content: string,
  parentCommentId: string | undefined,
  client: AppSupabaseClient,
) {
  const value = validContent(content);
  if (!value.ok) return value;
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const allowed = await canUserAccessBranch(branchId, "comment", client);
  if (!allowed.ok) return allowed;
  if (!allowed.data) return fail("FORBIDDEN", "Comment permission is required.");
  if (parentCommentId) {
    const parent = await readableComment(parentCommentId, client);
    if (!parent.ok) return parent;
    if (parent.data.branch_id !== branchId) {
      return fail("VALIDATION_ERROR", "Reply must belong to the same branch.");
    }
  }
  const result = await client.from("comments").insert({
    branch_id: branchId,
    target_type: "branch",
    target_id: branchId,
    parent_comment_id: parentCommentId,
    author_id: user.data.id,
    content: value.data,
    visibility: "branch_members",
  }).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(branchId, "comment_added", { comment_id: result.data.id }, client);
  return ok(result.data);
}

export const replyToComment = async (
  commentId: string,
  content: string,
  client: AppSupabaseClient,
) => {
  const parent = await readableComment(commentId, client);
  return parent.ok ? addComment(parent.data.branch_id, content, commentId, client) : parent;
};

async function canChange(commentId: string, client: AppSupabaseClient) {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const comment = await readableComment(commentId, client);
  if (!comment.ok) return comment;
  if (comment.data.author_id === user.data.id) return comment;
  const editor = await canUserAccessBranch(comment.data.branch_id, "edit", client);
  if (!editor.ok) return editor;
  return editor.data ? comment : fail("FORBIDDEN", "Only the author or an editor may change this comment.");
}

export async function updateComment(commentId: string, content: string, client: AppSupabaseClient) {
  const value = validContent(content);
  if (!value.ok) return value;
  const comment = await canChange(commentId, client);
  if (!comment.ok) return comment;
  const result = await client.from("comments").update({ content: value.data })
    .eq("id", commentId).select("*").single();
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function deleteComment(commentId: string, client: AppSupabaseClient) {
  const comment = await canChange(commentId, client);
  if (!comment.ok) return comment;
  const result = await client.from("comments").update({
    status: "deleted",
    deleted_at: new Date().toISOString(),
    content: "[deleted]",
  }).eq("id", commentId).select("*").single();
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

async function setResolved(commentId: string, resolved: boolean, client: AppSupabaseClient) {
  const comment = await canChange(commentId, client);
  if (!comment.ok) return comment;
  const result = await client.from("comments").update({ status: resolved ? "resolved" : "open" })
    .eq("id", commentId).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  if (resolved) await recordActivity(comment.data.branch_id, "comment_resolved", {
    comment_id: commentId,
  }, client);
  return ok(result.data);
}

export const resolveComment = (id: string, client: AppSupabaseClient) =>
  setResolved(id, true, client);
export const reopenComment = (id: string, client: AppSupabaseClient) =>
  setResolved(id, false, client);

export async function listBranchDiscussion(branchId: string, client: AppSupabaseClient) {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const result = await client.from("comments").select("*").eq("branch_id", branchId)
    .neq("status", "deleted").is("deleted_at", null).order("created_at");
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}
