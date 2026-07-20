import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import { ErrorState } from "@/components/ui/feedback";
import { getBranchPageData } from "@/features/branch-reading/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BranchReadingPage, ReadingIdentity } from "../reading-page";
import { CommentComposer } from "./comment-composer";
import { CommentEntry } from "./comment-entry";
import { InviteCollaboratorForm } from "./invite-form";

const roleLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function CommunityPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const client = await createServerSupabaseClient();
  const result = await getBranchPageData(branchId, client);
  if (!result.ok) {
    return <><AuthenticatedHeader /><main className="centered-state"><ErrorState title="Community unavailable" message={result.error.message} /></main></>;
  }
  const data = result.data;
  const { data: { user } } = await client.auth.getUser();
  const { data: pendingInvitations } = data.capabilities.canManage
    ? await client
        .from("collaboration_invites")
        .select("id,invitee_email,status")
        .eq("branch_id", branchId)
        .eq("status", "pending")
        .order("created_at")
    : { data: [] };
  return (
    <div className="branch-atmosphere">
      <AuthenticatedHeader />
      <BranchReadingPage data={data} eyebrow="Research community" title="Collaborators and Comments">
        <section className="reading-section" id="collaborators" tabIndex={-1}>
          <h2>Collaborators</h2>
          <h3>Owner</h3>
          <div className="community-list">
            <article>
              <ReadingIdentity name={data.owner?.display_name ?? data.owner?.username ?? "Branch owner"} avatarUrl={data.owner?.avatar_url} />
            </article>
          </div>
          <h3>Collaborators</h3>
          <div className="community-list">
            {data.collaborators.filter((item) => item.userId !== data.branch.owner_id).map((item) => (
              <article key={item.id}>
                <ReadingIdentity name={item.profile?.display_name ?? item.profile?.username ?? "Collaborator"} avatarUrl={item.profile?.avatar_url} />
              </article>
            ))}
          </div>
          {data.capabilities.role === "owner" && (pendingInvitations ?? []).length ? <>
            <h3>Pending invitations</h3>
            <div className="community-list">{(pendingInvitations ?? []).map((invitation) => (
              <article key={invitation.id}>
                <ReadingIdentity name={invitation.invitee_email} />
                <small>Pending</small>
              </article>
            ))}</div>
          </> : null}
          {!data.collaborators.filter((item) => item.userId !== data.branch.owner_id).length ? <p className="reading-empty">No collaborators yet.</p> : null}
          {data.capabilities.role === "owner" ? <InviteCollaboratorForm branchId={branchId} /> : null}
        </section>
        <section className="reading-section" id="comments" tabIndex={-1}>
          <h2>Comments</h2>
          {data.comments.length ? <div className="comment-reading-list">{data.comments.map((comment) => {
            const author = data.authors.find((profile) => profile.id === comment.author_id);
            const name = author?.display_name ?? author?.username ?? "Research contributor";
            return (
              <CommentEntry
                branchId={branchId}
                commentId={comment.id}
                content={comment.content}
                canChange={comment.author_id === user?.id}
                key={comment.id}
              >
                <ReadingIdentity name={name} avatarUrl={author?.avatar_url} />
                <small>{roleLabel(comment.target_type)} · {new Date(comment.created_at).toLocaleString()}{comment.updated_at !== comment.created_at ? " · Edited" : ""}</small>
              </CommentEntry>
            );
          })}</div> : <p className="reading-empty">No readable comments yet.</p>}
          {data.capabilities.canComment ? <CommentComposer branchId={branchId} /> : null}
        </section>
      </BranchReadingPage>
    </div>
  );
}
