"use server";

import { revalidatePath } from "next/cache";

import {
  addLinkedBranch,
  deleteConfirmedBranch,
  removeLinkedBranch,
  updateBranchPrivacy,
} from "@/features/branch-management/services";
import { searchAccessibleBranches } from "@/features/branch-links/services";
import { getLinkedBranches } from "@/features/branch-reading/services";
import {
  createFullSummary,
  createNote,
  deleteWorkspaceItem,
  updateFullSummary,
  updateNote,
} from "@/features/workspace/services";
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
  const links = await getLinkedBranches(branchId, client);
  if (!links.ok) return { ok: false as const, message: links.error.message };
  const link = links.data.find((item) => item.linkId === result.data.id);
  return link
    ? { ok: true as const, data: link }
    : { ok: false as const, message: "The link was saved but could not be displayed yet." };
}

export async function removeLinkedBranchAction(branchId: string, linkId: string) {
  const client = await createServerSupabaseClient();
  const result = await removeLinkedBranch(linkId, client);
  if (!result.ok) return { ok: false as const, message: result.error.message };
  revalidatePath(`/branches/${branchId}`);
  return { ok: true as const, data: result.data };
}

export async function saveBranchSummaryAction(
  branchId: string,
  summaryId: string | null,
  content: string,
) {
  const client = await createServerSupabaseClient();
  const result = summaryId
    ? await updateFullSummary(summaryId, content, client)
    : await createFullSummary(branchId, content, client);
  if (!result.ok) return { ok: false as const, message: result.error.message };
  revalidatePath(`/branches/${branchId}`);
  return { ok: true as const, data: result.data };
}

export async function saveBranchNoteAction(
  branchId: string,
  noteId: string | null,
  content: string,
) {
  const client = await createServerSupabaseClient();
  const result = noteId
    ? await updateNote(noteId, content, client)
    : await createNote(branchId, content, undefined, client);
  if (!result.ok) return { ok: false as const, message: result.error.message };
  revalidatePath(`/branches/${branchId}`);
  return { ok: true as const, data: result.data };
}

export async function deleteBranchNoteAction(branchId: string, noteId: string) {
  const client = await createServerSupabaseClient();
  const result = await deleteWorkspaceItem(noteId, client);
  if (!result.ok) return { ok: false as const, message: result.error.message };
  revalidatePath(`/branches/${branchId}`);
  return { ok: true as const, data: result.data };
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
