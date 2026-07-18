"use server";

import { revalidatePath } from "next/cache";

import {
  applyApprovedAIContribution,
  approveAIContribution,
  rejectAIContribution,
} from "@/features/ai-contributions/services";
import {
  updateBranchAIEnabledState,
  updateBranchPrivacy,
  updateBranchStatus,
} from "@/features/branch-management/services";
import { requestAIAssistance } from "@/features/ai-assistant/services";
import type { AIAssistantRequest } from "@/features/ai-assistant/types";
import type { AIApplicationTarget } from "@/features/ai-contributions/types";
import { createFullSummary, updateFullSummary } from "@/features/workspace/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

const result = <T,>(value: { ok: true; data: T } | { ok: false; error: { message: string } }) =>
  value.ok
    ? { ok: true as const, data: value.data }
    : { ok: false as const, message: value.error.message };

export async function saveFullSummaryAction(
  branchId: string,
  summaryId: string | null,
  content: string,
) {
  const client = await createServerSupabaseClient();
  const saved = summaryId
    ? await updateFullSummary(summaryId, content, client)
    : await createFullSummary(branchId, content, client);
  if (saved.ok) revalidatePath(`/branches/${branchId}`);
  return result(saved);
}

export async function savePrivacyAction(branchId: string, privacy: "private" | "public") {
  const client = await createServerSupabaseClient();
  const saved = await updateBranchPrivacy(branchId, privacy, client);
  if (saved.ok) revalidatePath(`/branches/${branchId}`);
  return result(saved);
}

export async function saveAIEnabledAction(branchId: string, enabled: boolean) {
  const client = await createServerSupabaseClient();
  return result(await updateBranchAIEnabledState(branchId, enabled, client));
}

export async function saveStatusAction(
  branchId: string,
  status: Enums<"branch_status">,
) {
  const client = await createServerSupabaseClient();
  return result(await updateBranchStatus(branchId, status, client));
}

export async function requestAIAssistanceAction(input: AIAssistantRequest) {
  const client = await createServerSupabaseClient();
  const generated = await requestAIAssistance(input, client);
  return result(generated);
}

export async function approveAIContributionAction(
  contributionId: string,
  editedText: string,
) {
  const client = await createServerSupabaseClient();
  return result(await approveAIContribution(contributionId, editedText.trim(), client));
}

export async function rejectAIContributionAction(contributionId: string) {
  const client = await createServerSupabaseClient();
  return result(await rejectAIContribution(contributionId, "Rejected in Editing Workspace", client));
}

export async function applyAIContributionAction(
  branchId: string,
  contributionId: string,
  target: AIApplicationTarget,
) {
  const client = await createServerSupabaseClient();
  const applied = await applyApprovedAIContribution(contributionId, target, undefined, client);
  if (applied.ok) {
    revalidatePath(`/branches/${branchId}`);
    revalidatePath(`/branches/${branchId}/workspace`);
  }
  return result(applied);
}
