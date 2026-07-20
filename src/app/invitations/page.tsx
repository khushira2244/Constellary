import { redirect } from "next/navigation";

import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { acceptInvitationAction } from "./actions";

type PendingInvite = {
  invitation_id: string;
  branch_id: string;
  branch_title: string;
  created_at: string;
};

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const client = await createServerSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login?returnTo=/invitations");
  const { data, error } = await client.rpc("list_my_pending_collaboration_invites" as never);
  const invitations = (data ?? []) as PendingInvite[];
  return (
    <>
      <AuthenticatedHeader />
      <main className="branch-reading-shell">
        <header className="branch-reading-header"><span>Collaboration</span><h1>Invitations</h1><p>Invitations sent to your signed-in email appear here.</p></header>
        {query.error || error ? <p className="auth-error">{query.error ?? error?.message}</p> : null}
        <section className="reading-section">
          {invitations.length ? <div className="community-list">{invitations.map((invitation) => (
            <article key={invitation.invitation_id}>
              <div><strong>{invitation.branch_title}</strong><small>Invited {new Date(invitation.created_at).toLocaleDateString()}</small></div>
              <form action={acceptInvitationAction.bind(null, invitation.invitation_id)}><button className="button button--primary" type="submit">Accept invitation</button></form>
            </article>
          ))}</div> : <p className="reading-empty">No pending invitations for this account.</p>}
        </section>
      </main>
    </>
  );
}
