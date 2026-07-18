import { redirect } from "next/navigation";

import { ErrorState } from "@/components/ui/feedback";
import { getBranchDraft } from "@/features/branch-drafts/services";
import {
  getBranchBasicInfo,
  getBranchPath,
  getBranchShortSummary,
} from "@/features/branch-reading/services";
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

  if (draft.data.parent_branch_id) {
    const [parent, path, summary] = await Promise.all([
      getBranchBasicInfo(draft.data.parent_branch_id, client),
      getBranchPath(draft.data.parent_branch_id, client),
      getBranchShortSummary(draft.data.parent_branch_id, client),
    ]);
    if (!parent.ok || !path.ok || !summary.ok || !path.data[0]) {
      const message = !parent.ok
        ? parent.error.message
        : !path.ok
          ? path.error.message
          : !summary.ok
            ? summary.error.message
            : "The parent branch root is unavailable.";
      return (
        <main className="centered-state">
          <ErrorState title="Could not load parent context" message={message} />
        </main>
      );
    }
    return (
      <CreationWorkspace
        draft={draft.data}
        parentContext={{
          id: parent.data.id,
          title: parent.data.title,
          summary: summary.data?.content ?? null,
          rootId: path.data[0].id,
        }}
      />
    );
  }

  return <CreationWorkspace draft={draft.data} />;
}
