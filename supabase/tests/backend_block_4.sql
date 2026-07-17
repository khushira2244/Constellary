\set ON_ERROR_STOP on
begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  id, 'authenticated', 'authenticated', email,
  extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', label, 'user_name', username), now(), now()
from (values
  ('d4000000-0000-4000-8000-000000000001'::uuid, 'block4-owner@test.local', 'Owner', 'block4owner'),
  ('d4000000-0000-4000-8000-000000000002'::uuid, 'block4-editor@test.local', 'Editor', 'block4editor'),
  ('d4000000-0000-4000-8000-000000000003'::uuid, 'block4-commenter@test.local', 'Commenter', 'block4commenter'),
  ('d4000000-0000-4000-8000-000000000004'::uuid, 'block4-viewer@test.local', 'Viewer', 'block4viewer')
) users(id, email, label, username);

select set_config('request.jwt.claim.sub', 'd4000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d4000000-0000-4000-8000-000000000001","email":"block4-owner@test.local","role":"authenticated"}',
  true
);

insert into public.branch_drafts (
  id, creator_id, title, original_idea, origin_type, short_summary, privacy
) values
  (
    'd4000000-0000-4000-8000-000000000010',
    'd4000000-0000-4000-8000-000000000001',
    'Block 4 branch', 'Locked original', 'own_idea', 'Short summary', 'private'
  ),
  (
    'd4000000-0000-4000-8000-000000000011',
    'd4000000-0000-4000-8000-000000000001',
    'Other branch', 'Other original', 'own_idea', 'Other summary', 'private'
  );

create temporary table block4_branches(label text primary key, id uuid);
insert into block4_branches values
  ('main', (public.confirm_branch_draft('d4000000-0000-4000-8000-000000000010')->>'branch_id')::uuid),
  ('other', (public.confirm_branch_draft('d4000000-0000-4000-8000-000000000011')->>'branch_id')::uuid);
grant select on table block4_branches to authenticated;
grant execute on function public.validate_branch_target(uuid, text, uuid) to authenticated;

select extensions.ok(
  (select ai_enabled from public.branches where id = (select id from block4_branches where label='main')),
  'new branches should enable AI workflows by default'
);

select extensions.ok(
  to_regclass('public.branch_summaries_unique_ai_application_idx') is not null
  and to_regclass('public.workspace_items_unique_ai_application_idx') is not null,
  'AI application uniqueness indexes should exist'
);

insert into public.branch_collaborators (branch_id, user_id, role, added_by)
select id, user_id, role::public.collaborator_role, 'd4000000-0000-4000-8000-000000000001'
from block4_branches
cross join (values
  ('d4000000-0000-4000-8000-000000000002'::uuid, 'editor'),
  ('d4000000-0000-4000-8000-000000000003'::uuid, 'commenter'),
  ('d4000000-0000-4000-8000-000000000004'::uuid, 'viewer')
) members(user_id, role)
where label = 'main';

set local role authenticated;

update public.branches set ai_enabled = false
where id = (select id from block4_branches where label='main');
select extensions.ok(
  not (select ai_enabled from public.branches where id = (select id from block4_branches where label='main')),
  'owner should update AI enabled state'
);

do $$
begin
  begin
    update public.branches set original_idea = 'Forbidden rewrite'
    where id = (select id from block4_branches where label='main');
    raise exception 'original idea update unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'original idea update unexpectedly succeeded' then raise; end if;
  end;
end;
$$;
select extensions.pass('confirmed branch original idea remains immutable');

insert into public.workspace_items (
  id, branch_id, item_type, content, author_id
) values (
  'd4000000-0000-4000-8000-000000000020',
  (select id from block4_branches where label='main'),
  'note', '{"text":"Owner note"}',
  'd4000000-0000-4000-8000-000000000001'
);
select extensions.pass('owner can create a Workspace item');

do $$
begin
  begin
    insert into public.workspace_items (
      branch_id, parent_item_id, item_type, content, author_id
    ) values (
      (select id from block4_branches where label='other'),
      'd4000000-0000-4000-8000-000000000020',
      'note', '{"text":"Cross branch child"}',
      'd4000000-0000-4000-8000-000000000001'
    );
    raise exception 'cross-branch parent unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'cross-branch parent unexpectedly succeeded' then raise; end if;
  end;
end;
$$;
select extensions.pass('cross-branch Workspace parent is rejected');

reset role;
select set_config('request.jwt.claim.sub', 'd4000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d4000000-0000-4000-8000-000000000002","email":"block4-editor@test.local","role":"authenticated"}',
  true
);
set local role authenticated;
insert into public.workspace_items (branch_id, item_type, content, author_id)
values (
  (select id from block4_branches where label='main'),
  'note', '{"text":"Editor note"}',
  'd4000000-0000-4000-8000-000000000002'
);
select extensions.pass('editor can create a Workspace item');

reset role;
select set_config('request.jwt.claim.sub', 'd4000000-0000-4000-8000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d4000000-0000-4000-8000-000000000003","email":"block4-commenter@test.local","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    insert into public.workspace_items (branch_id, item_type, content, author_id)
    values (
      (select id from block4_branches where label='main'),
      'note', '{"text":"Forbidden commenter note"}',
      'd4000000-0000-4000-8000-000000000003'
    );
    raise exception 'commenter Workspace write unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'commenter Workspace write unexpectedly succeeded' then raise; end if;
  end;
end;
$$;
select extensions.pass('commenter cannot create a Workspace item');
insert into public.comments (
  branch_id, target_type, target_id, author_id, content, visibility
) values (
  (select id from block4_branches where label='main'),
  'branch', (select id from block4_branches where label='main'),
  'd4000000-0000-4000-8000-000000000003',
  'Allowed commenter discussion', 'branch_members'
);
select extensions.pass('commenter can create a branch comment');

reset role;
select set_config('request.jwt.claim.sub', 'd4000000-0000-4000-8000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d4000000-0000-4000-8000-000000000004","email":"block4-viewer@test.local","role":"authenticated"}',
  true
);
set local role authenticated;
do $$
begin
  begin
    insert into public.comments (
      branch_id, target_type, target_id, author_id, content
    ) values (
      (select id from block4_branches where label='main'),
      'branch', (select id from block4_branches where label='main'),
      'd4000000-0000-4000-8000-000000000004', 'Forbidden viewer comment'
    );
    raise exception 'viewer comment unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'viewer comment unexpectedly succeeded' then raise; end if;
  end;
end;
$$;
select extensions.pass('viewer cannot create a branch comment');

reset role;
select * from extensions.finish();
rollback;
