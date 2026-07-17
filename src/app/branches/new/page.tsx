import { redirect } from "next/navigation";

import { ErrorState } from "@/components/ui/feedback";
import {
  createMainBranchDraft,
  getLatestEditableMainBranchDraft,
} from "@/features/branch-drafts/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NewBranchPage() {
  const client = await createServerSupabaseClient();
  const existing = await getLatestEditableMainBranchDraft(client);

  if (!existing.ok) {
    return (
      <main className="centered-state">
        <ErrorState
          title={existing.error.code === "AUTH_REQUIRED" ? "Sign in required" : "Could not start a branch"}
          message={
            existing.error.code === "AUTH_REQUIRED"
              ? "Sign in to Constellary before creating a research branch."
              : existing.error.message
          }
        />
      </main>
    );
  }

  if (existing.data) {
    redirect(`/branches/drafts/${existing.data.id}/workspace`);
  }

  const created = await createMainBranchDraft(client);
  if (!created.ok) {
    return (
      <main className="centered-state">
        <ErrorState title="Could not create the draft" message={created.error.message} />
      </main>
    );
  }

  redirect(`/branches/drafts/${created.data.id}/workspace`);
}
