import { redirect } from "next/navigation";

import { ErrorState } from "@/components/ui/feedback";
import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import {
  createSubbranchDraft,
  getLatestEditableSubbranchDraft,
} from "@/features/branch-drafts/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NewSubbranchPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const client = await createServerSupabaseClient();
  const existing = await getLatestEditableSubbranchDraft(branchId, client);
  if (!existing.ok) {
    return (
      <>
        <AuthenticatedHeader />
        <main className="centered-state">
          <ErrorState title="Could not start this subbranch" message={existing.error.message} />
        </main>
      </>
    );
  }
  if (existing.data) redirect(`/branches/drafts/${existing.data.id}/workspace`);

  const created = await createSubbranchDraft(branchId, client);
  if (!created.ok) {
    return (
      <>
        <AuthenticatedHeader />
        <main className="centered-state">
          <ErrorState title="Could not create the subbranch draft" message={created.error.message} />
        </main>
      </>
    );
  }
  redirect(`/branches/drafts/${created.data.id}/workspace`);
}
