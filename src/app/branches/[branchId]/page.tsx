import { ErrorState } from "@/components/ui/feedback";
import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import {
  getBranchTreePageData,
  getRootBranchId,
} from "@/features/branch-reading/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BranchView } from "./branch-view";

export default async function BranchPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const client = await createServerSupabaseClient();
  const root = await getRootBranchId(branchId, client);

  if (!root.ok) {
    return (
      <>
        <AuthenticatedHeader />
        <main className="centered-state">
          <ErrorState title="Branch unavailable" message={root.error.message} />
        </main>
      </>
    );
  }

  const tree = await getBranchTreePageData(root.data, client);
  if (!tree.ok) {
    return (
      <>
        <AuthenticatedHeader />
        <main className="centered-state">
          <ErrorState title="Could not load the branch tree" message={tree.error.message} />
        </main>
      </>
    );
  }

  return (
    <div className="branch-atmosphere">
      <AuthenticatedHeader />
      <BranchView root={tree.data} />
    </div>
  );
}
