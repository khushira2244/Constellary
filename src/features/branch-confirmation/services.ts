import { getBranchDraft } from "@/features/branch-drafts/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Json } from "@/types/database";
import type {
  BranchConfirmationResult,
  ConfirmationInvitation,
} from "./types";
import { validateRequiredDraftFields } from "./validation";

const parseResult = (value: Json): ServiceResult<BranchConfirmationResult> => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return fail("DATABASE_ERROR", "Confirmation returned an invalid result.");
  }
  const branchId = value.branch_id;
  const alreadyConfirmed = value.already_confirmed;
  const invitations = value.invitations;
  if (
    typeof branchId !== "string" ||
    typeof alreadyConfirmed !== "boolean" ||
    !Array.isArray(invitations)
  ) {
    return fail("DATABASE_ERROR", "Confirmation returned incomplete branch data.");
  }
  return ok({
    branchId,
    alreadyConfirmed,
    invitations: invitations as unknown as ConfirmationInvitation[],
  });
};

export async function confirmBranchDraft(
  draftId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchConfirmationResult>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const draft = await getBranchDraft(draftId, client);
  if (!draft.ok) return draft;

  if (draft.data.confirmed_branch_id) {
    return ok({
      branchId: draft.data.confirmed_branch_id,
      alreadyConfirmed: true,
      invitations: [],
    });
  }

  const validation = validateRequiredDraftFields(draft.data);
  if (!validation.ok) return validation;

  const { data, error } = await client.rpc("confirm_branch_draft", {
    draft_id: draft.data.id,
  });
  if (error) return databaseFailure(error.message);
  return parseResult(data);
}

export async function confirmMainBranchDraft(
  draftId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchConfirmationResult>> {
  const draft = await getBranchDraft(draftId, client);
  if (!draft.ok) return draft;
  if (draft.data.parent_branch_id) {
    return fail("VALIDATION_ERROR", "This draft is a subbranch draft.");
  }
  return confirmBranchDraft(draftId, client);
}

export async function confirmSubbranchDraft(
  draftId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<BranchConfirmationResult>> {
  const draft = await getBranchDraft(draftId, client);
  if (!draft.ok) return draft;
  if (!draft.data.parent_branch_id) {
    return fail("VALIDATION_ERROR", "This draft is a main branch draft.");
  }
  return confirmBranchDraft(draftId, client);
}
