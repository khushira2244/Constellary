\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

select extensions.ok(
  has_schema_privilege('service_role', 'public', 'USAGE'),
  'service_role has USAGE on public schema'
);

select extensions.ok(has_table_privilege('service_role', 'public.profiles', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed profiles');
select extensions.ok(has_table_privilege('service_role', 'public.branch_drafts', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed branch drafts');
select extensions.ok(has_table_privilege('service_role', 'public.branches', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed branches');
select extensions.ok(has_table_privilege('service_role', 'public.branch_links', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed branch links');
select extensions.ok(has_table_privilege('service_role', 'public.branch_summaries', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed summaries');
select extensions.ok(has_table_privilege('service_role', 'public.workspace_items', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed workspace items');
select extensions.ok(has_table_privilege('service_role', 'public.sources', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed sources');
select extensions.ok(has_table_privilege('service_role', 'public.branch_collaborators', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed collaborators');
select extensions.ok(has_table_privilege('service_role', 'public.collaboration_invites', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed invitations');
select extensions.ok(has_table_privilege('service_role', 'public.comments', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed comments');
select extensions.ok(has_table_privilege('service_role', 'public.ai_contributions', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed AI contributions');
select extensions.ok(has_table_privilege('service_role', 'public.files', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed file metadata');
select extensions.ok(has_table_privilege('service_role', 'public.activity_events', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed activity');
select extensions.ok(has_table_privilege('service_role', 'public.access_grants', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed access grants');
select extensions.ok(has_table_privilege('service_role', 'public.featured_branches', 'SELECT,INSERT,UPDATE,DELETE'), 'service_role can seed personal featured branches');

select extensions.ok(
  has_function_privilege(
    'service_role',
    'public.validate_branch_target(uuid,text,uuid)',
    'EXECUTE'
  ),
  'service_role can execute target validation used by seed triggers'
);

select * from extensions.finish();
rollback;
