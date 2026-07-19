import Link from "next/link";

import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import { ErrorState } from "@/components/ui/feedback";
import { getBranchPageData } from "@/features/branch-reading/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BranchReadingPage } from "../reading-page";

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function LinkedBranchesPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const client = await createServerSupabaseClient();
  const result = await getBranchPageData(branchId, client);
  if (!result.ok) {
    return <><AuthenticatedHeader /><main className="centered-state"><ErrorState title="Linked branches unavailable" message={result.error.message} /></main></>;
  }
  const data = result.data;
  const outgoing = data.linkedBranches.filter((link) => link.direction === "outgoing");
  const incoming = data.linkedBranches.filter((link) => link.direction === "incoming");
  const group = (title: string, links: typeof outgoing) => (
    <section className="reading-section">
      <h2>{title}</h2>
      {links.length ? <div className="linked-reading-grid">{links.map((link) => (
        <article key={link.linkId}>
          <div><span>{label(link.relationshipType)}</span><i>{label(link.branch.privacy)}</i></div>
          <h3>{link.branch.title}</h3>
          <p>{link.relationshipNote ?? link.shortSummary ?? "No readable relationship note or summary."}</p>
          <small>{label(link.branch.status)} · Linked {new Date(link.createdAt).toLocaleDateString()} · Updated {new Date(link.branch.updated_at).toLocaleDateString()}</small>
          <Link href={`/branches/${link.branch.id}`}>Open Branch</Link>
        </article>
      ))}</div> : <p className="reading-empty">No {title.toLowerCase()}.</p>}
    </section>
  );
  return (
    <div className="branch-atmosphere">
      <AuthenticatedHeader />
      <BranchReadingPage data={data} eyebrow="Provenance references" title="Linked Branches">
        {group("Outgoing links", outgoing)}
        {group("Incoming links", incoming)}
      </BranchReadingPage>
    </div>
  );
}
