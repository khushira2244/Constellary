\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'b2000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'block2-owner@constellary.test',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Block Two Owner","user_name":"block2owner"}'::jsonb, now(), now()
  ),
  (
    'b2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'block2-invitee@constellary.test',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Block Two Invitee","user_name":"block2invitee"}'::jsonb, now(), now()
  ),
  (
    'b2000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'block2-decline@constellary.test',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Block Two Decline","user_name":"block2decline"}'::jsonb, now(), now()
  );

select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"b2000000-0000-4000-8000-000000000001","email":"block2-owner@constellary.test","role":"authenticated"}',
  true
);

insert into public.branch_drafts (
  id, creator_id, title, original_idea, origin_type, origin_details,
  short_summary, privacy, ai_role_data
)
values (
  'b2000000-0000-4000-8000-000000000010',
  'b2000000-0000-4000-8000-000000000001',
  'Block 2 main branch',
  'A permanent original idea',
  'own_idea',
  '{"source":"human"}'::jsonb,
  'The approved short summary.',
  'private',
  jsonb_build_array(jsonb_build_object(
    'contribution_type', 'classification',
    'model_name', 'gpt-test',
    'input_context_summary', 'Classified the draft topic.',
    'generated_content', jsonb_build_object('label', 'memory'),
    'approval_status', 'generated'
  ))
);

create temporary table block2_results(label text primary key, result jsonb);

insert into block2_results
values (
  'main',
  public.confirm_branch_draft('b2000000-0000-4000-8000-000000000010')
);

select extensions.ok(
  (select not (result ->> 'already_confirmed')::boolean from block2_results where label = 'main'),
  'first confirmation should create the main branch'
);

select extensions.ok(
  (
    select branch.parent_branch_id is null
      and branch.original_idea_locked_at is not null
      and branch.origin_type = 'own_idea'
      and branch.origin_details = '{"source":"human"}'::jsonb
    from public.branches branch
    where branch.id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'main')
  ),
  'main branch identity, original idea, and origin should be permanently locked'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.branch_collaborators member
    where member.branch_id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'main')
      and member.user_id = 'b2000000-0000-4000-8000-000000000001'
      and member.role = 'owner'
  ),
  'confirmation should create exactly one owner membership'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.branch_summaries summary
    where summary.branch_id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'main')
      and summary.summary_type = 'short'
      and summary.status = 'approved'
      and summary.is_current
  ),
  'confirmation should create one current approved short summary'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.ai_contributions contribution
    where contribution.branch_id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'main')
      and contribution.model_name = 'gpt-test'
  ),
  'draft AI attribution should become a permanent contribution'
);

insert into block2_results
values (
  'repeat',
  public.confirm_branch_draft('b2000000-0000-4000-8000-000000000010')
);

select extensions.ok(
  (
    select (repeat.result ->> 'already_confirmed')::boolean
      and repeat.result ->> 'branch_id' = main.result ->> 'branch_id'
    from block2_results repeat
    cross join block2_results main
    where repeat.label = 'repeat' and main.label = 'main'
  ),
  'repeated confirmation should safely return the same branch'
);

insert into public.branch_drafts (
  id, creator_id, parent_branch_id, title, original_idea, origin_type,
  short_summary, privacy, linked_branches_data, collaborators_data
)
select
  'b2000000-0000-4000-8000-000000000011',
  'b2000000-0000-4000-8000-000000000001',
  (result ->> 'branch_id')::uuid,
  'Block 2 subbranch',
  'A directly grown idea',
  'existing_branch',
  'The subbranch approved summary.',
  'private',
  jsonb_build_array(jsonb_build_object(
    'target_branch_id', result ->> 'branch_id',
    'relationship_type', 'developed_from',
    'relationship_note', 'Direct research growth'
  )),
  jsonb_build_array(jsonb_build_object(
    'email', 'block2-invitee@constellary.test',
    'role', 'viewer',
    'access_scope', 'entire_branch'
  ))
from block2_results
where label = 'main';

insert into block2_results
values (
  'child',
  public.confirm_branch_draft('b2000000-0000-4000-8000-000000000011')
);

select extensions.ok(
  (
    select child.parent_branch_id = parent.id
    from public.branches child
    join public.branches parent on parent.id = child.parent_branch_id
    where child.id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'child')
      and parent.id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'main')
  ),
  'subbranch confirmation should preserve its direct parent relationship'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.branch_links link
    where link.source_branch_id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'child')
      and link.target_branch_id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'main')
      and link.imported_summary_id is not null
  ),
  'confirmation should create the permanent linked-branch relationship'
);

select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"b2000000-0000-4000-8000-000000000002","email":"block2-invitee@constellary.test","role":"authenticated"}',
  true
);

select extensions.ok(
  not public.can_view_branch(
    (select (result ->> 'branch_id')::uuid from block2_results where label = 'child')
  ),
  'a pending invite must not grant branch access'
);

select public.accept_collaboration_invite(
  (select result -> 'invitations' -> 0 ->> 'token' from block2_results where label = 'child')
);

select extensions.ok(
  public.can_view_branch(
    (select (result ->> 'branch_id')::uuid from block2_results where label = 'child')
  ),
  'acceptance should grant the invited collaborator access'
);

select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"b2000000-0000-4000-8000-000000000001","email":"block2-owner@constellary.test","role":"authenticated"}',
  true
);

create temporary table invitation_results(label text primary key, result jsonb);
insert into invitation_results
select 'decline', public.create_collaboration_invite(
  (select (result ->> 'branch_id')::uuid from block2_results where label = 'child'),
  'block2-decline@constellary.test',
  'commenter',
  'entire_branch',
  now() + interval '1 day'
);

select extensions.ok(
  (
    select invite.token_hash <> result ->> 'token'
    from invitation_results request
    join public.collaboration_invites invite
      on invite.id = (request.result ->> 'invitation_id')::uuid
    where request.label = 'decline'
  ),
  'raw invitation tokens must never be stored'
);

select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"b2000000-0000-4000-8000-000000000003","email":"block2-decline@constellary.test","role":"authenticated"}',
  true
);
select public.decline_collaboration_invite(
  (select result ->> 'token' from invitation_results where label = 'decline')
);

select extensions.ok(
  (
    select invite.status = 'declined'
      and not exists (
        select 1 from public.branch_collaborators member
        where member.branch_id = invite.branch_id
          and member.user_id = 'b2000000-0000-4000-8000-000000000003'
      )
    from public.collaboration_invites invite
    where invite.id = (
      select (result ->> 'invitation_id')::uuid
      from invitation_results where label = 'decline'
    )
  ),
  'declining should not create branch access'
);

select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"b2000000-0000-4000-8000-000000000001","email":"block2-owner@constellary.test","role":"authenticated"}',
  true
);
insert into invitation_results
select 'revoke', public.create_collaboration_invite(
  (select (result ->> 'branch_id')::uuid from block2_results where label = 'main'),
  'block2-decline@constellary.test',
  'viewer',
  'summary_only',
  null
);
select public.revoke_collaboration_invite(
  (select (result ->> 'invitation_id')::uuid from invitation_results where label = 'revoke')
);

select extensions.ok(
  (
    select status = 'revoked'
    from public.collaboration_invites
    where id = (select (result ->> 'invitation_id')::uuid from invitation_results where label = 'revoke')
  ),
  'branch managers should be able to revoke pending invitations'
);

do $block$
declare
  locked boolean := false;
begin
  begin
    update public.branches
    set original_idea = 'Forbidden rewrite'
    where id = (select (result ->> 'branch_id')::uuid from block2_results where label = 'main');
  exception when others then
    locked := true;
  end;
  if not locked then
    raise exception 'ASSERTION FAILED: original idea and origin must remain immutable';
  end if;
end;
$block$;

select extensions.pass('confirmed branch original idea and origin remain immutable');
select * from extensions.finish();

rollback;
