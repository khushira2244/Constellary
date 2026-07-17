import { redirect } from "next/navigation";

import { ErrorState } from "@/components/ui/feedback";
import { getBranchDraft } from "@/features/branch-drafts/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CreationWorkspace } from "./workspace";

export default async function DraftWorkspacePage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const client = await createServerSupabaseClient();
  const draft = await getBranchDraft(draftId, client);

  if (!draft.ok) {
    const copy = draft.error.code === "AUTH_REQUIRED"
      ? ["Sign in required", "Sign in to continue working on this branch draft."]
      : draft.error.code === "NOT_FOUND"
        ? ["Draft not found", "This draft does not exist, or you do not have permission to open it."]
        : ["Could not load the draft", draft.error.message];
    return (
      <main className="centered-state">
        <ErrorState title={copy[0]} message={copy[1]} />
      </main>
    );
  }

  if (draft.data.confirmed_branch_id) {
    redirect(`/branches/${draft.data.confirmed_branch_id}`);
  }

  return <CreationWorkspace draft={draft.data} />;
}
