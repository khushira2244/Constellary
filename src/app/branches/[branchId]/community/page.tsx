import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import { ErrorState } from "@/components/ui/feedback";
import { getBranchPageData } from "@/features/branch-reading/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BranchReadingPage, ReadingIdentity } from "../reading-page";
import { addBranchCommentAction } from "./actions";
import { CommentEntry } from "./comment-entry";

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
        .select("id,role,status")
        .eq("branch_id", branchId)
        .eq("status", "pending")
        .order("created_at")
    : { data: [] };
  const addComment = addBranchCommentAction.bind(null, branchId);
  return (
    <div className="branch-atmosphere">
      <AuthenticatedHeader />
      <BranchReadingPage data={data} eyebrow="Research community" title="Collaborators and Comments">
        <section className="reading-section">
          <h2>Collaborators</h2>
          <div className="community-list">
            <article>
              <ReadingIdentity name={data.owner?.display_name ?? data.owner?.username ?? "Branch owner"} avatarUrl={data.owner?.avatar_url} />
              <span className="role-badge">Owner</span><small>Active</small>
            </article>
            {data.collaborators.filter((item) => item.userId !== data.branch.owner_id).map((item) => (
              <article key={item.id}>
                <ReadingIdentity name={item.profile?.display_name ?? item.profile?.username ?? "Collaborator"} avatarUrl={item.profile?.avatar_url} />
                <span className="role-badge">{roleLabel(item.role)}</span><small>Active</small>
              </article>
            ))}
            {(pendingInvitations ?? []).map((invitation) => (
              <article key={invitation.id}>
                <ReadingIdentity name="Invited collaborator" />
                <span className="role-badge">{roleLabel(invitation.role)}</span><small>Pending</small>
              </article>
            ))}
          </div>
          {!data.collaborators.length ? <p className="reading-empty">No additional collaborators.</p> : null}
          {data.capabilities.canManage ? <p className="reading-note">Invitation, role, and removal controls are deferred to Task 2.</p> : null}
        </section>
        <section className="reading-section">
          <h2>Comments</h2>
          {data.comments.length ? <div className="comment-reading-list">{data.comments.map((comment) => {
            const author = data.authors.find((profile) => profile.id === comment.author_id);
            const name = author?.display_name ?? author?.username ?? "Research contributor";
            return (
              <CommentEntry
                branchId={branchId}
                commentId={comment.id}
                content={comment.content}
                canChange={comment.author_id === user?.id || data.capabilities.canEdit}
                key={comment.id}
              >
                <ReadingIdentity name={name} avatarUrl={author?.avatar_url} />
                <small>{roleLabel(comment.target_type)} · {new Date(comment.created_at).toLocaleString()}{comment.updated_at !== comment.created_at ? " · Edited" : ""}</small>
              </CommentEntry>
            );
          })}</div> : <p className="reading-empty">No readable comments yet.</p>}
          {data.capabilities.canComment ? (
            <form className="comment-compose" action={addComment}>
              <label><span>Add a comment</span><textarea name="content" required maxLength={5000} /></label>
              <button type="submit">Post Comment</button>
            </form>
          ) : null}
        </section>
      </BranchReadingPage>
    </div>
  );
}
