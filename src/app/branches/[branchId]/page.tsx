import { ErrorState } from "@/components/ui/feedback";
import { Panel } from "@/components/ui/panel";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getBranchPageData } from "@/features/branch-reading/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const privacyLabels: Record<string, string> = {
  private: "Private",
  selected_people: "Selected people",
  project_members: "Project members",
  secure_link: "Secure link",
  public: "Public",
};

export default async function ConfirmedBranchPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const client = await createServerSupabaseClient();
  const result = await getBranchPageData(branchId, client);

  if (!result.ok) {
    return (
      <main className="centered-state">
        <ErrorState
          title={result.error.code === "NOT_FOUND" ? "Branch not found" : "Could not open the branch"}
          message={result.error.message}
        />
      </main>
    );
  }

  const { branch, owner, shortSummary } = result.data;
  return (
    <>
      <header className="topbar">
        <div className="brand">Constellary</div>
        <div className="topbar__title">Confirmed branch</div>
        <div className="topbar__right"><SignOutButton /></div>
      </header>
      <main>
        <Panel className="confirmed-card">
          <div className="success-mark" aria-hidden="true">✓</div>
          <span className="eyebrow">Confirmation successful</span>
          <h1>{branch.title}</h1>
          <p className="lede">This branch has been created and its starting point is now protected.</p>
          <p className="provenance-note">
            Your original idea is now part of the branch provenance record.
          </p>
          <dl className="detail-list">
            <dt>Original idea</dt><dd>{branch.original_idea}</dd>
            <dt>Origin</dt><dd>Fresh idea</dd>
            <dt>Short summary</dt><dd>{shortSummary?.content ?? "No summary available."}</dd>
            <dt>Privacy</dt><dd>{privacyLabels[branch.privacy] ?? branch.privacy}</dd>
            <dt>Owner</dt><dd>{owner?.display_name ?? owner?.username ?? "You"}</dd>
            {process.env.NODE_ENV === "development" ? (
              <><dt>Branch ID</dt><dd>{branch.id}</dd></>
            ) : null}
          </dl>
        </Panel>
      </main>
    </>
  );
}
