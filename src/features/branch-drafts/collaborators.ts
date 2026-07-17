import { collaboratorRoleSchema, emailSchema, uuidSchema } from "./schemas";
import { getBranchDraft } from "./services";
import type { DraftCollaborator } from "./types";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Enums, Json } from "@/types/database";

const asCollaborators = (value: Json): ServiceResult<DraftCollaborator[]> =>
  Array.isArray(value)
    ? ok(value as unknown as DraftCollaborator[])
    : fail("DATABASE_ERROR", "Draft collaborator data is not an array.");

const editableCollaborators = async (draftId: string, client: AppSupabaseClient) => {
  const id = uuidSchema.safeParse(draftId);
  if (!id.success) return fail("VALIDATION_ERROR", "Invalid draft id.");
  const draft = await getBranchDraft(id.data, client);
  if (!draft.ok) return draft;
  if (draft.data.confirmed_branch_id) return fail("CONFLICT", "Confirmed drafts are immutable.");
  const collaborators = asCollaborators(draft.data.collaborators_data);
  if (!collaborators.ok) return collaborators;
  return ok({ draft: draft.data, collaborators: collaborators.data });
};

const save = async (
  current: Awaited<ReturnType<typeof editableCollaborators>> & { ok: true },
  next: DraftCollaborator[],
  client: AppSupabaseClient,
) => {
  const { data, error } = await client
    .from("branch_drafts")
    .update({ collaborators_data: next as unknown as Json })
    .eq("id", current.data.draft.id)
    .eq("creator_id", current.data.draft.creator_id)
    .eq("updated_at", current.data.draft.updated_at)
    .is("confirmed_branch_id", null)
    .select("collaborators_data")
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  if (!data) return fail("CONFLICT", "The draft was changed concurrently.");
  return asCollaborators(data.collaborators_data);
};

export async function getDraftCollaborators(
  draftId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<DraftCollaborator[]>> {
  const draft = await getBranchDraft(draftId, client);
  if (!draft.ok) return draft;
  return asCollaborators(draft.data.collaborators_data);
}

export async function addDraftCollaborator(
  draftId: string,
  email: string,
  role: Exclude<Enums<"collaborator_role">, "owner">,
  client: AppSupabaseClient,
): Promise<ServiceResult<DraftCollaborator[]>> {
  const validEmail = emailSchema.safeParse(email);
  const validRole = collaboratorRoleSchema.safeParse(role);
  if (!validEmail.success || !validRole.success) {
    return fail("VALIDATION_ERROR", "A valid email and non-owner role are required.");
  }
  const current = await editableCollaborators(draftId, client);
  if (!current.ok) return current;
  if (current.data.collaborators.some((item) => item.email === validEmail.data)) {
    return fail("CONFLICT", "This collaborator is already in the draft.");
  }
  return save(
    current,
    [...current.data.collaborators, {
      email: validEmail.data,
      role: validRole.data,
      access_scope: "entire_branch",
    }],
    client,
  );
}

export async function updateDraftCollaboratorRole(
  draftId: string,
  email: string,
  role: Exclude<Enums<"collaborator_role">, "owner">,
  client: AppSupabaseClient,
): Promise<ServiceResult<DraftCollaborator[]>> {
  const validEmail = emailSchema.safeParse(email);
  const validRole = collaboratorRoleSchema.safeParse(role);
  if (!validEmail.success || !validRole.success) {
    return fail("VALIDATION_ERROR", "A valid email and non-owner role are required.");
  }
  const current = await editableCollaborators(draftId, client);
  if (!current.ok) return current;
  if (!current.data.collaborators.some((item) => item.email === validEmail.data)) {
    return fail("NOT_FOUND", "Draft collaborator not found.");
  }
  return save(
    current,
    current.data.collaborators.map((item) =>
      item.email === validEmail.data ? { ...item, role: validRole.data } : item,
    ),
    client,
  );
}

export async function removeDraftCollaborator(
  draftId: string,
  email: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<DraftCollaborator[]>> {
  const validEmail = emailSchema.safeParse(email);
  if (!validEmail.success) return fail("VALIDATION_ERROR", "A valid email is required.");
  const current = await editableCollaborators(draftId, client);
  if (!current.ok) return current;
  const next = current.data.collaborators.filter((item) => item.email !== validEmail.data);
  if (next.length === current.data.collaborators.length) {
    return fail("NOT_FOUND", "Draft collaborator not found.");
  }
  return save(current, next, client);
}
