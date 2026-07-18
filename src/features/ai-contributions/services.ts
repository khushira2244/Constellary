import { recordActivity } from "@/features/activity/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok } from "@/lib/services/result";
import type { AppSupabaseClient, Json } from "@/types/database";
import {
  contributionTypeMap,
  type AIApplicationTarget,
  type AIContributionKind,
  type AIOutput,
} from "./types";

const outputText = (value: Json) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

async function appliedTarget(contributionId: string, client: AppSupabaseClient) {
  const summary = await client.from("branch_summaries").select("id")
    .eq("ai_contribution_id", contributionId).maybeSingle();
  const item = await client.from("workspace_items").select("id")
    .contains("content", { ai_contribution_id: contributionId }).maybeSingle();
  if (summary.error || item.error) {
    return databaseFailure((summary.error ?? item.error)!.message);
  }
  return ok(summary.data?.id ?? item.data?.id ?? null);
}

async function contribution(id: string, client: AppSupabaseClient) {
  const result = await client.from("ai_contributions").select("*").eq("id", id).maybeSingle();
  if (result.error) return databaseFailure(result.error.message);
  return result.data ? ok(result.data) : fail("NOT_FOUND", "AI contribution not found.");
}

export async function createAIContributionDraft(
  branchId: string,
  contributionType: AIContributionKind,
  inputContext: string,
  output: AIOutput,
  client: AppSupabaseClient,
  metadata?: { modelName?: string },
) {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  if (!branch.data.ai_enabled) return fail("FORBIDDEN", "AI contributions are disabled for this branch.");
  const result = await client.from("ai_contributions").insert({
    branch_id: branchId,
    target_type: "branch",
    target_id: branchId,
    contribution_type: contributionTypeMap[contributionType],
    model_name: metadata?.modelName?.trim() || "pending-openai-integration",
    input_context_summary: inputContext.trim(),
    generated_content: output,
    requested_by: user.data.id,
    approval_status: "generated",
  }).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(branchId, "ai_content_generated", { contribution_id: result.data.id }, client);
  return ok(result.data);
}

export const getAIContribution = contribution;

export async function listBranchAIContributions(branchId: string, client: AppSupabaseClient) {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const result = await client.from("ai_contributions").select("*")
    .eq("branch_id", branchId).order("created_at", { ascending: false });
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function updateAIContributionDraft(
  contributionId: string,
  output: AIOutput,
  client: AppSupabaseClient,
) {
  const existing = await contribution(contributionId, client);
  if (!existing.ok) return existing;
  const branch = await requireBranchAccess(existing.data.branch_id, "edit", client);
  if (!branch.ok) return branch;
  if (!["generated", "edited"].includes(existing.data.approval_status)) {
    return fail("CONFLICT", "Only unapproved AI drafts may be edited.");
  }
  const result = await client.from("ai_contributions").update({
    generated_content: output,
    approval_status: "edited",
  }).eq("id", contributionId).select("*").single();
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function approveAIContribution(
  contributionId: string,
  editedOutput: AIOutput | undefined,
  client: AppSupabaseClient,
) {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const existing = await contribution(contributionId, client);
  if (!existing.ok) return existing;
  const branch = await requireBranchAccess(existing.data.branch_id, "edit", client);
  if (!branch.ok) return branch;
  if (existing.data.approval_status === "approved") return ok(existing.data);
  const result = await client.from("ai_contributions").update({
    ...(editedOutput === undefined ? {} : { generated_content: editedOutput }),
    approval_status: "approved",
    approved_by: user.data.id,
    approved_at: new Date().toISOString(),
  }).eq("id", contributionId).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(existing.data.branch_id, "ai_content_approved", {
    contribution_id: contributionId,
    human_edited: editedOutput !== undefined,
  }, client);
  return ok(result.data);
}

export async function rejectAIContribution(
  contributionId: string,
  reason: string | undefined,
  client: AppSupabaseClient,
) {
  const existing = await contribution(contributionId, client);
  if (!existing.ok) return existing;
  const branch = await requireBranchAccess(existing.data.branch_id, "edit", client);
  if (!branch.ok) return branch;
  if (existing.data.approval_status === "approved") {
    return fail("CONFLICT", "An approved contribution cannot be rejected.");
  }
  const generated = existing.data.generated_content;
  const preserved = generated && typeof generated === "object" && !Array.isArray(generated)
    ? { ...generated, rejection_reason: reason?.trim() || null }
    : { original_output: generated, rejection_reason: reason?.trim() || null };
  const result = await client.from("ai_contributions").update({
    generated_content: preserved,
    approval_status: "rejected",
  }).eq("id", contributionId).select("*").single();
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function applyApprovedAIContribution(
  contributionId: string,
  targetItemType: AIApplicationTarget,
  targetItemId: string | undefined,
  client: AppSupabaseClient,
) {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const existing = await contribution(contributionId, client);
  if (!existing.ok) return existing;
  const branch = await requireBranchAccess(existing.data.branch_id, "edit", client);
  if (!branch.ok) return branch;
  if (existing.data.approval_status !== "approved") {
    return fail("FORBIDDEN", "Human approval is required before applying AI content.");
  }
  const prior = await appliedTarget(contributionId, client);
  if (!prior.ok) return prior;
  if (prior.data) {
    return ok({ targetId: prior.data, alreadyApplied: true });
  }

  if (targetItemType === "full_summary") {
    if (targetItemId) return fail("VALIDATION_ERROR", "Full summary application creates a new attributed version.");
    await client.from("branch_summaries").update({ is_current: false })
      .eq("branch_id", existing.data.branch_id).eq("summary_type", "full").eq("is_current", true);
    const applied = await client.from("branch_summaries").insert({
      branch_id: existing.data.branch_id,
      summary_type: "full",
      content: outputText(existing.data.generated_content),
      status: "draft",
      created_by: user.data.id,
      ai_contribution_id: contributionId,
    }).select("id").single();
    if (applied.error) {
      if (applied.error.code === "23505") {
        const raced = await appliedTarget(contributionId, client);
        if (raced.ok && raced.data) return ok({ targetId: raced.data, alreadyApplied: true });
      }
      return databaseFailure(applied.error.message);
    }
    return ok({ targetId: applied.data.id, alreadyApplied: false });
  }

  const envelope = {
    kind: targetItemType === "visual_summary" ? "visual_summary" : "note",
    ai_contribution_id: contributionId,
    content: existing.data.generated_content,
    human_approved_by: user.data.id,
  };
  if (targetItemId) {
    const target = await client.from("workspace_items").select("id,branch_id")
      .eq("id", targetItemId).maybeSingle();
    if (target.error) return databaseFailure(target.error.message);
    if (!target.data || target.data.branch_id !== existing.data.branch_id) {
      return fail("VALIDATION_ERROR", "Target item must belong to the same branch.");
    }
    const updated = await client.from("workspace_items").update({ content: envelope })
      .eq("id", targetItemId).select("id").single();
    if (updated.error) {
      if (updated.error.code === "23505") {
        const raced = await appliedTarget(contributionId, client);
        if (raced.ok && raced.data) return ok({ targetId: raced.data, alreadyApplied: true });
      }
      return databaseFailure(updated.error.message);
    }
    return ok({ targetId: updated.data.id, alreadyApplied: false });
  }
  const created = await client.from("workspace_items").insert({
    branch_id: existing.data.branch_id,
    item_type: targetItemType === "note" ? "note" : "note",
    title: targetItemType === "visual_summary" ? "Visual Summary" : null,
    content: envelope,
    author_id: user.data.id,
  }).select("id").single();
  if (created.error) {
    if (created.error.code === "23505") {
      const raced = await appliedTarget(contributionId, client);
      if (raced.ok && raced.data) return ok({ targetId: raced.data, alreadyApplied: true });
    }
    return databaseFailure(created.error.message);
  }
  return ok({ targetId: created.data.id, alreadyApplied: false });
}

export async function getApprovedAIAttribution(branchId: string, client: AppSupabaseClient) {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const result = await client.from("ai_contributions").select("*")
    .eq("branch_id", branchId).eq("approval_status", "approved")
    .order("approved_at", { ascending: false });
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}
