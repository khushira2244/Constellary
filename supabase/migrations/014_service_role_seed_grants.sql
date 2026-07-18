-- The service-role JWT bypasses RLS, but PostgreSQL still requires ordinary
-- schema and table privileges before PostgREST can execute administrative
-- seed operations. These grants do not change anon/authenticated access.

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.profiles,
  public.branch_drafts,
  public.branches,
  public.branch_links,
  public.branch_summaries,
  public.workspace_items,
  public.sources,
  public.branch_collaborators,
  public.collaboration_invites,
  public.comments,
  public.ai_contributions,
  public.files,
  public.activity_events,
  public.access_grants
to service_role;
