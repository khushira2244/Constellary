\set ON_ERROR_STOP on
begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select id, 'authenticated', 'authenticated', email,
  extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', label, 'user_name', username), now(), now()
from (values
  ('f1000000-0000-4000-8000-000000000001'::uuid, 'feature-owner@test.local', 'Feature Owner', 'featureowner'),
  ('f1000000-0000-4000-8000-000000000002'::uuid, 'feature-viewer@test.local', 'Feature Viewer', 'featureviewer'),
  ('f1000000-0000-4000-8000-000000000003'::uuid, 'feature-outsider@test.local', 'Feature Outsider', 'featureoutsider')
) users(id, email, label, username);

insert into public.branches (
  id, owner_id, title, original_idea, origin_type, status, privacy,
  original_idea_locked_at
) values
  ('f1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000001',
   'Accessible private branch', 'Private idea', 'own_idea', 'active', 'private', now()),
  ('f1000000-0000-4000-8000-000000000011', 'f1000000-0000-4000-8000-000000000003',
   'Inaccessible private branch', 'Other private idea', 'own_idea', 'active', 'private', now());

insert into public.branch_collaborators (branch_id, user_id, role, added_by)
values (
  'f1000000-0000-4000-8000-000000000010',
  'f1000000-0000-4000-8000-000000000002',
  'viewer',
  'f1000000-0000-4000-8000-000000000001'
);

select extensions.ok(
  to_regclass('public.featured_branches') is not null,
  'featured branches table exists'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.featured_branches', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated users receive feature-management privileges governed by RLS'
);

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1000000-0000-4000-8000-000000000002","email":"feature-viewer@test.local","role":"authenticated"}',
  true
);
set local role authenticated;

insert into public.featured_branches (user_id, branch_id, position)
values (
  'f1000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000010',
  0
);
select extensions.is(
  (select count(*)::integer from public.featured_branches),
  1,
  'an authenticated viewer can feature an accessible branch'
);

do $test$
begin
  begin
    insert into public.featured_branches (user_id, branch_id)
    values (
      'f1000000-0000-4000-8000-000000000002',
      'f1000000-0000-4000-8000-000000000010'
    );
    raise exception 'duplicate feature unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$test$;
select extensions.pass('duplicate personal feature rows are rejected');

do $test$
begin
  begin
    insert into public.featured_branches (user_id, branch_id)
    values (
      'f1000000-0000-4000-8000-000000000002',
      'f1000000-0000-4000-8000-000000000011'
    );
    raise exception 'inaccessible branch feature unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
select extensions.pass('an inaccessible private branch cannot be featured');

do $test$
begin
  begin
    insert into public.featured_branches (user_id, branch_id)
    values (
      'f1000000-0000-4000-8000-000000000003',
      'f1000000-0000-4000-8000-000000000010'
    );
    raise exception 'cross-user feature unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
select extensions.pass('a user cannot create another user''s feature row');

delete from public.featured_branches
where branch_id = 'f1000000-0000-4000-8000-000000000010';
select extensions.is(
  (select count(*)::integer from public.featured_branches),
  0,
  'a user can remove their own featured branch'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select extensions.throws_ok(
  $$insert into public.featured_branches (user_id, branch_id)
    values ('f1000000-0000-4000-8000-000000000003',
            'f1000000-0000-4000-8000-000000000010')$$,
  '42501',
  null,
  'anonymous users cannot feature branches'
);

reset role;
select * from extensions.finish();
rollback;
