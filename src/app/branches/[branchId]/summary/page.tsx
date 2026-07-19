import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import { ErrorState } from "@/components/ui/feedback";
import { getBranchPageData } from "@/features/branch-reading/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BranchReadingPage, ReadingIdentity } from "../reading-page";

export default async function FullSummaryPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const client = await createServerSupabaseClient();
  const result = await getBranchPageData(branchId, client);
  if (!result.ok) {
    return <><AuthenticatedHeader /><main className="centered-state"><ErrorState title="Summary unavailable" message={result.error.message} /></main></>;
  }
  const data = result.data;
  const summary = data.fullSummary;
  const author = data.authors.find((profile) => profile.id === summary?.created_by);
  const ai = summary
    ? data.aiAttribution.find((item) => item.target_id === summary.id || item.contribution_type === "summary_draft")
    : null;
  return (
    <div className="branch-atmosphere">
      <AuthenticatedHeader />
      <BranchReadingPage data={data} eyebrow="Readable research record" title="Full Summary">
        <article className="summary-reading-card">
          {summary ? (
            <>
              <div className="summary-reading-meta">
                <ReadingIdentity
                  name={author?.display_name ?? author?.username ?? "Research contributor"}
                  avatarUrl={author?.avatar_url}
                />
                <span>Updated {new Date(summary.updated_at).toLocaleDateString()} · {summary.status}</span>
              </div>
              <div className="summary-reading-content">{summary.content}</div>
              <footer>
                <span>Approval: {summary.status}</span>
                <span>{ai ? `AI-attributed · ${ai.model_name} · ${ai.approval_status}` : "Human-authored record"}</span>
              </footer>
            </>
          ) : <p className="reading-empty">No readable full summary has been published for this branch.</p>}
        </article>
        <section className="reading-section">
          <h2>Source and reference context</h2>
          <p>{data.sources.length} readable sources · {data.linkedBranches.length} accessible linked branches</p>
        </section>
      </BranchReadingPage>
    </div>
  );
}
