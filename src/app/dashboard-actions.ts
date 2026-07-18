"use server";

import { redirect } from "next/navigation";

import { createMainBranchDraft, deleteBranchDraft } from "@/features/branch-drafts/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createFreshMainBranch() {
  const client = await createServerSupabaseClient();
  const created = await createMainBranchDraft(client);
  if (!created.ok) redirect("/?dashboardError=create");
  redirect(`/branches/drafts/${created.data.id}/workspace`);
}

export async function deleteDashboardDraft(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const client = await createServerSupabaseClient();
  const deleted = await deleteBranchDraft(draftId, client);
  redirect(deleted.ok ? "/#drafts" : "/?dashboardError=delete#drafts");
}
