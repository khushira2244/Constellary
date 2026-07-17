create table public.comments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  target_type public.comment_target_type not null default 'branch',
  target_id uuid,
  author_id uuid not null references public.profiles(id) on delete restrict,
  content text not null,
  status public.comment_status not null default 'open',
  visibility public.content_visibility not null default 'inherit',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint comments_content_not_blank check (btrim(content) <> ''),
  constraint comments_target_presence check (
    (target_type = 'branch' and (target_id is null or target_id = branch_id))
    or
    (target_type <> 'branch' and target_id is not null)
  ),
  constraint comments_not_own_parent check (parent_comment_id is null or parent_comment_id <> id),
  constraint comments_deleted_consistency check (
    (status = 'deleted' and deleted_at is not null)
    or
    (status <> 'deleted' and deleted_at is null)
  )
);

create index comments_branch_created_idx on public.comments (branch_id, created_at);
create index comments_parent_idx on public.comments (parent_comment_id);
create index comments_target_idx on public.comments (target_type, target_id);

create table public.ai_contributions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  target_type public.ai_target_type not null default 'branch',
  target_id uuid,
  contribution_type public.ai_contribution_type not null,
  model_name text not null,
  input_context_summary text not null,
  generated_content jsonb not null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  approval_status public.ai_approval_status not null default 'generated',
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ai_contributions_model_not_blank check (btrim(model_name) <> ''),
  constraint ai_contributions_context_not_blank check (btrim(input_context_summary) <> ''),
  constraint ai_contributions_target_presence check (
    (target_type = 'branch' and (target_id is null or target_id = branch_id))
    or
    (target_type <> 'branch' and target_id is not null)
  ),
  constraint ai_contributions_approval_consistency check (
    (approval_status = 'approved' and approved_by is not null and approved_at is not null)
    or
    (approval_status <> 'approved' and approved_at is null)
  )
);

create index ai_contributions_branch_idx on public.ai_contributions (branch_id, created_at);
create index ai_contributions_target_idx on public.ai_contributions (target_type, target_id);
create index ai_contributions_approval_idx on public.ai_contributions (approval_status);

alter table public.branch_summaries
  add column ai_contribution_id uuid
  references public.ai_contributions(id)
  on delete set null;

create table public.files (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  workspace_item_id uuid references public.workspace_items(id) on delete set null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  storage_bucket text not null,
  storage_path text not null unique,
  visibility public.content_visibility not null default 'inherit',
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint files_name_not_blank check (btrim(file_name) <> ''),
  constraint files_mime_not_blank check (btrim(mime_type) <> ''),
  constraint files_size_nonnegative check (file_size >= 0),
  constraint files_bucket_not_blank check (btrim(storage_bucket) <> ''),
  constraint files_path_not_blank check (btrim(storage_path) <> '')
);

create index files_branch_idx on public.files (branch_id, created_at);
create index files_workspace_item_idx on public.files (workspace_item_id);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type public.activity_event_type not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  visibility public.content_visibility not null default 'branch_members',
  created_at timestamptz not null default now(),
  constraint activity_events_entity_type_not_blank check (btrim(entity_type) <> ''),
  constraint activity_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index activity_events_branch_created_idx
  on public.activity_events (branch_id, created_at desc);
create index activity_events_actor_idx on public.activity_events (actor_id);
create index activity_events_entity_idx on public.activity_events (entity_type, entity_id);

create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create or replace function public.validate_branch_target(
  target_branch_id uuid,
  target_kind text,
  target_resource_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
begin
  if target_kind = 'branch' then
    return target_resource_id is null or target_resource_id = target_branch_id;
  elsif target_kind = 'summary' then
    return exists (
      select 1 from public.branch_summaries
      where id = target_resource_id and branch_id = target_branch_id
    );
  elsif target_kind = 'workspace_item' then
    return exists (
      select 1 from public.workspace_items
      where id = target_resource_id and branch_id = target_branch_id
    );
  elsif target_kind = 'source' then
    return exists (
      select 1 from public.sources
      where id = target_resource_id and branch_id = target_branch_id
    );
  elsif target_kind = 'file' then
    return exists (
      select 1 from public.files
      where id = target_resource_id and branch_id = target_branch_id
    );
  elsif target_kind = 'activity_event' then
    return exists (
      select 1 from public.activity_events
      where id = target_resource_id and branch_id = target_branch_id
    );
  end if;

  return false;
end;
$function$;

create or replace function public.enforce_comment_target()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if not public.validate_branch_target(new.branch_id, new.target_type::text, new.target_id) then
    raise exception 'Comment target does not belong to the selected branch';
  end if;

  if new.parent_comment_id is not null and not exists (
    select 1
    from public.comments parent
    where parent.id = new.parent_comment_id
      and parent.branch_id = new.branch_id
  ) then
    raise exception 'Parent comment does not belong to the selected branch';
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_ai_target()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if not public.validate_branch_target(new.branch_id, new.target_type::text, new.target_id) then
    raise exception 'AI contribution target does not belong to the selected branch';
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_file_workspace_branch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if new.workspace_item_id is not null and not exists (
    select 1
    from public.workspace_items item
    where item.id = new.workspace_item_id
      and item.branch_id = new.branch_id
  ) then
    raise exception 'Workspace item does not belong to the selected branch';
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_summary_ai_attribution()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if new.ai_contribution_id is not null and not exists (
    select 1
    from public.ai_contributions contribution
    where contribution.id = new.ai_contribution_id
      and contribution.branch_id = new.branch_id
  ) then
    raise exception 'AI contribution does not belong to the summary branch';
  end if;

  return new;
end;
$function$;

create trigger comments_validate_target
before insert or update on public.comments
for each row execute function public.enforce_comment_target();

create trigger ai_contributions_validate_target
before insert or update on public.ai_contributions
for each row execute function public.enforce_ai_target();

create trigger files_validate_workspace_branch
before insert or update on public.files
for each row execute function public.enforce_file_workspace_branch();

create trigger branch_summaries_validate_ai_attribution
before insert or update on public.branch_summaries
for each row execute function public.enforce_summary_ai_attribution();

create or replace function public.accept_collaboration_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
declare
  invite public.collaboration_invites%rowtype;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select *
  into invite
  from public.collaboration_invites
  where token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Invitation is invalid';
  end if;

  if invite.status = 'accepted' and invite.invitee_user_id = auth.uid() then
    return invite.branch_id;
  end if;

  if invite.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;

  if invite.expires_at is not null and invite.expires_at <= now() then
    raise exception 'Invitation has expired';
  end if;

  if current_email = '' or current_email <> lower(invite.invitee_email) then
    raise exception 'Invitation belongs to another email address';
  end if;

  insert into public.branch_collaborators (
    branch_id,
    user_id,
    role,
    access_scope,
    added_by
  )
  values (
    invite.branch_id,
    auth.uid(),
    invite.role,
    invite.access_scope,
    invite.inviter_id
  )
  on conflict (branch_id, user_id)
  do update set
    role = excluded.role,
    access_scope = excluded.access_scope,
    updated_at = now()
  where public.branch_collaborators.role <> 'owner';

  update public.collaboration_invites
  set
    status = 'accepted',
    invitee_user_id = auth.uid(),
    accepted_at = now()
  where id = invite.id;

  insert into public.activity_events (
    branch_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    invite.branch_id,
    auth.uid(),
    'collaborator_joined',
    'profile',
    auth.uid(),
    jsonb_build_object('invite_id', invite.id, 'role', invite.role)
  );

  return invite.branch_id;
end;
$function$;

revoke all on function public.accept_collaboration_invite(text) from public;
grant execute on function public.accept_collaboration_invite(text) to authenticated;

revoke all on function public.validate_branch_target(uuid, text, uuid) from public;
revoke all on function public.enforce_comment_target() from public;
revoke all on function public.enforce_ai_target() from public;
revoke all on function public.enforce_file_workspace_branch() from public;
revoke all on function public.enforce_summary_ai_attribution() from public;
