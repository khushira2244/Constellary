create table public.branch_collaborators (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.collaborator_role not null,
  access_scope public.access_scope not null default 'entire_branch',
  added_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_collaborators_unique_user unique (branch_id, user_id)
);

create index branch_collaborators_user_idx on public.branch_collaborators (user_id);
create index branch_collaborators_branch_role_idx
  on public.branch_collaborators (branch_id, role);

create table public.collaboration_invites (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete restrict,
  invitee_email text not null,
  invitee_user_id uuid references public.profiles(id) on delete set null,
  role public.collaborator_role not null,
  access_scope public.access_scope not null default 'entire_branch',
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint collaboration_invites_email_not_blank check (btrim(invitee_email) <> ''),
  constraint collaboration_invites_role_not_owner check (role <> 'owner'),
  constraint collaboration_invites_acceptance_consistency check (
    (status = 'accepted' and accepted_at is not null and invitee_user_id is not null)
    or
    (status <> 'accepted' and accepted_at is null)
  )
);

create unique index collaboration_invites_one_pending_email_idx
  on public.collaboration_invites (branch_id, lower(invitee_email))
  where status = 'pending';
create index collaboration_invites_invitee_user_idx
  on public.collaboration_invites (invitee_user_id);
create index collaboration_invites_expiry_idx
  on public.collaboration_invites (expires_at)
  where status = 'pending';

create trigger branch_collaborators_set_updated_at
before update on public.branch_collaborators
for each row execute function public.set_updated_at();

create or replace function public.is_branch_member(
  requested_branch_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1
    from public.branches branch
    where branch.id = requested_branch_id
      and branch.owner_id = requested_user_id
  )
  or exists (
    select 1
    from public.branch_collaborators member
    where member.branch_id = requested_branch_id
      and member.user_id = requested_user_id
  );
$function$;

create or replace function public.can_view_branch(
  requested_branch_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1
    from public.branches branch
    where branch.id = requested_branch_id
      and (
        branch.privacy = 'public'
        or branch.owner_id = requested_user_id
        or exists (
          select 1
          from public.branch_collaborators member
          where member.branch_id = branch.id
            and member.user_id = requested_user_id
        )
      )
  );
$function$;

create or replace function public.can_edit_branch(
  requested_branch_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1
    from public.branches branch
    where branch.id = requested_branch_id
      and branch.owner_id = requested_user_id
  )
  or exists (
    select 1
    from public.branch_collaborators member
    where member.branch_id = requested_branch_id
      and member.user_id = requested_user_id
      and member.role in ('owner', 'editor')
  );
$function$;

create or replace function public.can_manage_branch(
  requested_branch_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1
    from public.branches branch
    where branch.id = requested_branch_id
      and branch.owner_id = requested_user_id
  )
  or exists (
    select 1
    from public.branch_collaborators member
    where member.branch_id = requested_branch_id
      and member.user_id = requested_user_id
      and member.role = 'owner'
  );
$function$;

create or replace function public.can_comment_branch(
  requested_branch_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select exists (
    select 1
    from public.branches branch
    where branch.id = requested_branch_id
      and branch.owner_id = requested_user_id
  )
  or exists (
    select 1
    from public.branch_collaborators member
    where member.branch_id = requested_branch_id
      and member.user_id = requested_user_id
      and member.role in ('owner', 'editor', 'reviewer', 'commenter')
  );
$function$;

revoke all on function public.is_branch_member(uuid, uuid) from public;
revoke all on function public.can_view_branch(uuid, uuid) from public;
revoke all on function public.can_edit_branch(uuid, uuid) from public;
revoke all on function public.can_manage_branch(uuid, uuid) from public;
revoke all on function public.can_comment_branch(uuid, uuid) from public;
grant execute on function public.is_branch_member(uuid, uuid) to anon, authenticated;
grant execute on function public.can_view_branch(uuid, uuid) to anon, authenticated;
grant execute on function public.can_edit_branch(uuid, uuid) to authenticated;
grant execute on function public.can_manage_branch(uuid, uuid) to authenticated;
grant execute on function public.can_comment_branch(uuid, uuid) to authenticated;
