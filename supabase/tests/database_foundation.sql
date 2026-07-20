\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(21);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'owner@constellary.test',
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Owner Researcher","user_name":"owner"}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'viewer@constellary.test',
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Invited Viewer","user_name":"viewer"}'::jsonb,
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'outsider@constellary.test',
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Outside Researcher","user_name":"outsider"}'::jsonb,
    now(),
    now()
  );

select extensions.ok(
  (
    select count(*) = 3
    from public.profiles
    where id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333'
    )
  ),
  'auth trigger should create three profiles'
);

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@constellary.test","role":"authenticated"}',
  true
);

insert into public.branch_drafts (
  id,
  creator_id,
  title,
  original_idea,
  origin_type,
  short_summary,
  privacy
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  'Foundational Memory Branch',
  'Investigate how memory changes research navigation.',
  'own_idea',
  'A foundational branch about memory-aware research navigation.',
  'public'
);

create temporary table confirmation_results (
  label text primary key,
  result jsonb not null
);

grant select on confirmation_results to authenticated, anon;

insert into confirmation_results (label, result)
select
  'parent',
  public.confirm_branch_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');

select extensions.ok(
  (
    select (result ->> 'already_confirmed')::boolean = false
    from confirmation_results
    where label = 'parent'
  ),
  'first confirmation should create a branch'
);

select extensions.ok(
  (
    select
      branch.original_idea_locked_at is not null
      and branch.parent_branch_id is null
    from public.branches branch
    where branch.id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'parent'
    )
  ),
  'confirmed starting branch should be locked and have no parent'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.branch_summaries summary
    where summary.branch_id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'parent'
    )
      and summary.summary_type = 'short'
      and summary.status = 'approved'
      and summary.is_current
  ),
  'confirmation should create one approved current short summary'
);

insert into public.branch_drafts (
  id,
  creator_id,
  parent_branch_id,
  title,
  original_idea,
  origin_type,
  origin_details,
  short_summary,
  privacy,
  linked_branches_data,
  collaborators_data,
  ai_role_data
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '11111111-1111-4111-8111-111111111111',
  (
    select (result ->> 'branch_id')::uuid
    from confirmation_results
    where label = 'parent'
  ),
  'Memory Provenance Subbranch',
  'Preserve how memory-related research changes direction.',
  'existing_branch',
  '{"reason":"Developed from the foundational branch"}'::jsonb,
  'A subbranch that preserves changes in research direction.',
  'private',
  jsonb_build_array(
    jsonb_build_object(
      'target_branch_id',
      (
        select result ->> 'branch_id'
        from confirmation_results
        where label = 'parent'
      ),
      'relationship_type',
      'derived_from',
      'relationship_note',
      'Uses the approved parent summary as provenance.'
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'email',
      'viewer@constellary.test',
      'role',
      'viewer',
      'access_scope',
      'entire_branch'
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'contribution_type',
      'idea_suggestion',
      'model_name',
      'GPT-5.6',
      'input_context_summary',
      'The owner asked AI to identify a provenance question.',
      'generated_content',
      jsonb_build_object('suggestion', 'Track direction changes explicitly.'),
      'approval_status',
      'approved'
    )
  )
);

insert into confirmation_results (label, result)
select
  'child',
  public.confirm_branch_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');

select extensions.ok(
  (
    select child.parent_branch_id = parent.id
    from public.branches child
    cross join public.branches parent
    where child.id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
      and parent.id = (
        select (result ->> 'branch_id')::uuid
        from confirmation_results
        where label = 'parent'
      )
  ),
  'subbranch should preserve direct parent ancestry'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.branch_links link
    where link.source_branch_id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
      and link.target_branch_id = (
        select (result ->> 'branch_id')::uuid
        from confirmation_results
        where label = 'parent'
      )
      and link.relationship_type = 'derived_from'
      and link.imported_summary_id is not null
  ),
  'linked branch should be distinct from ancestry and import an approved summary'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.ai_contributions contribution
    where contribution.branch_id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
      and contribution.model_name = 'GPT-5.6'
      and contribution.approval_status = 'approved'
      and contribution.approved_by = '11111111-1111-4111-8111-111111111111'
  ),
  'AI contribution should remain attributed and approved'
);

select extensions.ok(
  (
    select jsonb_array_length(result -> 'invitations') = 1
    from confirmation_results
    where label = 'child'
  ),
  'confirmation should return one raw invitation token without storing it'
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"viewer@constellary.test","role":"authenticated"}',
  true
);

select public.accept_collaboration_invite(
  (
    select result -> 'invitations' -> 0 ->> 'token'
    from confirmation_results
    where label = 'child'
  )
);

select extensions.ok(
  (
    select count(*) = 1
    from public.branch_collaborators collaborator
    where collaborator.branch_id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
      and collaborator.user_id = '22222222-2222-4222-8222-222222222222'
      and collaborator.role = 'viewer'
  ),
  'accepted invitation should create viewer membership'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.activity_events event
    where event.branch_id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
      and event.event_type = 'collaborator_joined'
      and event.actor_id = '22222222-2222-4222-8222-222222222222'
  ),
  'invitation acceptance should create an activity event'
);

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@constellary.test","role":"authenticated"}',
  true
);

select extensions.ok(
  (
    select
      (public.confirm_branch_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
        ->> 'branch_id')::uuid
      =
      (result ->> 'branch_id')::uuid
      and
      (public.confirm_branch_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
        ->> 'already_confirmed')::boolean
    from confirmation_results
    where label = 'child'
  ),
  'repeated confirmation should return the existing branch safely'
);

do $test$
begin
  begin
    update public.branches
    set original_idea = 'Attempted silent rewrite'
    where id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    );
    raise exception 'ASSERTION FAILED: original idea update unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm not like 'Confirmed branch identity%' then
        raise;
      end if;
  end;
end;
$test$;
select extensions.pass('confirmed branch identity cannot be rewritten');

do $test$
begin
  begin
    update public.branch_summaries
    set content = 'Attempted overwrite'
    where branch_id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
      and summary_type = 'short'
      and is_current;
    raise exception 'ASSERTION FAILED: approved summary overwrite unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm not like 'Approved summaries are immutable%' then
        raise;
      end if;
  end;
end;
$test$;
select extensions.pass('approved human summary cannot be overwritten');

do $test$
declare
  child_id uuid;
  parent_id uuid;
begin
  select (result ->> 'branch_id')::uuid
  into child_id
  from confirmation_results
  where label = 'child';

  select (result ->> 'branch_id')::uuid
  into parent_id
  from confirmation_results
  where label = 'parent';

  begin
    insert into public.branch_links (
      source_branch_id,
      target_branch_id,
      relationship_type,
      created_by
    )
    values (
      child_id,
      parent_id,
      'derived_from',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'ASSERTION FAILED: duplicate branch link unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end;
$test$;
select extensions.pass('duplicate branch relationship is rejected');

do $test$
declare
  child_id uuid;
  parent_summary_id uuid;
begin
  select (result ->> 'branch_id')::uuid
  into child_id
  from confirmation_results
  where label = 'child';

  select summary.id
  into parent_summary_id
  from public.branch_summaries summary
  where summary.branch_id = (
    select (result ->> 'branch_id')::uuid
    from confirmation_results
    where label = 'parent'
  )
    and summary.summary_type = 'short'
    and summary.is_current;

  begin
    insert into public.comments (
      branch_id,
      target_type,
      target_id,
      author_id,
      content
    )
    values (
      child_id,
      'summary',
      parent_summary_id,
      '11111111-1111-4111-8111-111111111111',
      'Cross-branch comment should fail.'
    );
    raise exception 'ASSERTION FAILED: cross-branch comment unexpectedly succeeded';
  exception
    when raise_exception then
      if sqlerrm not like 'Comment target does not belong%' then
        raise;
      end if;
  end;
end;
$test$;
select extensions.pass('cross-branch comment target is rejected');

insert into public.workspace_items (
  id,
  branch_id,
  item_type,
  title,
  content,
  visibility,
  author_id
)
values (
  '44444444-4444-4444-8444-444444444444',
  (
    select (result ->> 'branch_id')::uuid
    from confirmation_results
    where label = 'child'
  ),
  'note',
  'Selected private note',
  '{"body":"Only explicitly selected people can read this."}'::jsonb,
  'selected_people',
  '11111111-1111-4111-8111-111111111111'
);

insert into public.access_grants (
  branch_id,
  resource_type,
  resource_id,
  user_id,
  permission,
  granted_by
)
values (
  (
    select (result ->> 'branch_id')::uuid
    from confirmation_results
    where label = 'child'
  ),
  'workspace_item',
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  'view',
  '11111111-1111-4111-8111-111111111111'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","email":"outsider@constellary.test","role":"authenticated"}',
  true
);

select extensions.ok(
  (
    select count(*) = 0
    from public.branches
    where id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
  ),
  'outsider should not see the private branch'
);

select extensions.ok(
  (
    select count(*) = 1
    from public.workspace_items
    where id = '44444444-4444-4444-8444-444444444444'
  ),
  'explicit access grant should expose only the selected private content'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"viewer@constellary.test","role":"authenticated"}',
  true
);

select extensions.ok(
  (
    select count(*) = 1
    from public.branches
    where id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
  ),
  'accepted viewer should see the private branch'
);

do $test$
begin
  begin
    insert into public.comments (
      branch_id,
      target_type,
      author_id,
      content
    )
    values (
      (
        select (result ->> 'branch_id')::uuid
        from confirmation_results
        where label = 'child'
      ),
      'branch',
      '22222222-2222-4222-8222-222222222222',
      'A viewer must not be allowed to comment.'
    );
    raise exception 'ASSERTION FAILED: viewer comment unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;
select extensions.pass('viewer cannot create a comment');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);

select extensions.ok(
  (
    select count(*) = 1
    from public.branches
    where id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'parent'
    )
      and privacy = 'public'
  ),
  'anonymous readers should see the public branch'
);

select extensions.ok(
  (
    select count(*) = 0
    from public.branches
    where id = (
      select (result ->> 'branch_id')::uuid
      from confirmation_results
      where label = 'child'
    )
      and privacy = 'private'
  ),
  'anonymous readers should not see private branches'
);

reset role;

select * from extensions.finish();

rollback;
