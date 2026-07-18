import { redirect } from "next/navigation";

import { ErrorState } from "@/components/ui/feedback";
import { getEditableBranchView, getRootBranchId } from "@/features/branch-reading/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EditingWorkspace } from "./editing-workspace";

export default async function ConfirmedBranchWorkspacePage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const client = await createServerSupabaseClient();
  const [branch, root] = await Promise.all([
    getEditableBranchView(branchId, client),
    getRootBranchId(branchId, client),
  ]);

  if (!branch.ok) {
    if (branch.error.code === "AUTH_REQUIRED") redirect(`/login?returnTo=/branches/${branchId}/workspace`);
    return (
      <main className="centered-state">
        <ErrorState
          title={branch.error.code === "FORBIDDEN" ? "Editing access required" : "Workspace unavailable"}
          message={branch.error.message}
        />
      </main>
    );
  }
  if (!root.ok) {
    return <main className="centered-state"><ErrorState title="Workspace unavailable" message={root.error.message} /></main>;
  }

  return (
    <EditingWorkspace
      data={branch.data}
      rootBranchId={root.data}
      aiConfigured={Boolean(process.env.OPENAI_API_KEY)}
    />
  );
}
