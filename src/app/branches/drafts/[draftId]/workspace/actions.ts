"use server";

import { confirmMainBranchDraft } from "@/features/branch-confirmation/services";
import {
  progressWithAIRole,
  type DraftActionResult,
  type DraftSnapshot,
} from "@/features/branch-creation/model";
import {
  updateBranchDraftOrigin,
  updateBranchDraftOriginalIdea,
  updateBranchDraftPrivacy,
  updateBranchDraftProgress,
  updateBranchDraftShortSummary,
  updateBranchDraftTitle,
} from "@/features/branch-drafts/services";
import type { ServiceResult } from "@/lib/services/result";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const failure = (result: Extract<ServiceResult<unknown>, { ok: false }>): DraftActionResult => ({
  ok: false,
  code: result.error.code,
  message: result.error.message,
});

async function saveSnapshot(
  draftId: string,
  snapshot: DraftSnapshot,
): Promise<DraftActionResult> {
  const client = await createServerSupabaseClient();
  const updates = [
    await updateBranchDraftOrigin(draftId, { originType: "own_idea" }, client),
    await updateBranchDraftOriginalIdea(draftId, snapshot.originalIdea, client),
    await updateBranchDraftTitle(draftId, snapshot.title, client),
    await updateBranchDraftShortSummary(draftId, snapshot.shortSummary, client),
    await updateBranchDraftPrivacy(draftId, snapshot.privacy, client),
    await updateBranchDraftProgress(draftId, progressWithAIRole(snapshot), client),
  ];

  const failed = updates.find((result) => !result.ok);
  if (failed && !failed.ok) return failure(failed);
  const latest = updates.at(-1);
  if (!latest?.ok) {
    return { ok: false, code: "DATABASE_ERROR", message: "The draft could not be saved." };
  }
  return { ok: true, savedAt: latest.data.updated_at };
}

export async function saveDraftSnapshotAction(
  draftId: string,
  snapshot: DraftSnapshot,
): Promise<DraftActionResult> {
  return saveSnapshot(draftId, snapshot);
}

export async function confirmDraftAction(
  draftId: string,
  snapshot: DraftSnapshot,
): Promise<DraftActionResult> {
  const saved = await saveSnapshot(draftId, snapshot);
  if (!saved.ok) return saved;

  const client = await createServerSupabaseClient();
  const confirmed = await confirmMainBranchDraft(draftId, client);
  if (!confirmed.ok) return failure(confirmed);
  return {
    ok: true,
    savedAt: saved.savedAt,
    branchId: confirmed.data.branchId,
    alreadyConfirmed: confirmed.data.alreadyConfirmed,
  };
}
