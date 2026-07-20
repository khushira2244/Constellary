create or replace function public.create_simple_collaboration_invite(
  requested_branch_id uuid,
  requested_invitee_email text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
set row_security = off
as $function$
declare
  normalized_email text := lower(btrim(requested_invitee_email));
  owner_email text;
  existing_user_id uuid;
  created_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if not exists (
    select 1 from public.branches
    where id = requested_branch_id and owner_id = auth.uid()
  ) then raise exception 'Only the branch owner can invite collaborators'; end if;
  if normalized_email = '' or normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid invitation email is required';
  end if;

  select lower(email) into owner_email from auth.users where id = auth.uid();
  if normalized_email = owner_email then raise exception 'The owner cannot invite themselves'; end if;

  select id into existing_user_id from auth.users where lower(email) = normalized_email limit 1;
  if existing_user_id is not null and exists (
    select 1 from public.branch_collaborators
    where branch_id = requested_branch_id and user_id = existing_user_id
  ) then raise exception 'This person is already a collaborator'; end if;

  insert into public.collaboration_invites (
    branch_id, inviter_id, invitee_email, invitee_user_id, role,
    access_scope, token_hash
  ) values (
    requested_branch_id, auth.uid(), normalized_email, existing_user_id, 'editor',
    'entire_branch', encode(extensions.digest(extensions.gen_random_bytes(32), 'sha256'), 'hex')
  )
  returning id into created_id;

  return created_id;
end;
$function$;

create or replace function public.list_my_pending_collaboration_invites()
returns table (
  invitation_id uuid,
  branch_id uuid,
  branch_title text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
  select invite.id, invite.branch_id, branch.title, invite.created_at
  from public.collaboration_invites invite
  join public.branches branch on branch.id = invite.branch_id
  where invite.status = 'pending'
    and (invite.expires_at is null or invite.expires_at > now())
    and lower(invite.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by invite.created_at desc;
$function$;

create or replace function public.accept_collaboration_invite_by_id(invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
declare
  invite public.collaboration_invites%rowtype;
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select * into invite from public.collaboration_invites where id = invitation_id for update;
  if not found then raise exception 'Invitation was not found'; end if;
  if current_email = '' or current_email <> lower(invite.invitee_email) then
    raise exception 'Invitation belongs to another email address';
  end if;
  if invite.status = 'accepted' and invite.invitee_user_id = auth.uid() then return invite.branch_id; end if;
  if invite.status <> 'pending' then raise exception 'Invitation is no longer pending'; end if;
  if invite.expires_at is not null and invite.expires_at <= now() then raise exception 'Invitation has expired'; end if;

  insert into public.branch_collaborators (branch_id, user_id, role, access_scope, added_by)
  values (invite.branch_id, auth.uid(), 'editor', 'entire_branch', invite.inviter_id)
  on conflict (branch_id, user_id) do update
    set role = 'editor', access_scope = 'entire_branch', updated_at = now()
    where public.branch_collaborators.role <> 'owner';

  update public.collaboration_invites
  set status = 'accepted', invitee_user_id = auth.uid(), accepted_at = coalesce(accepted_at, now())
  where id = invite.id;
  return invite.branch_id;
end;
$function$;

revoke all on function public.create_simple_collaboration_invite(uuid, text) from public;
revoke all on function public.list_my_pending_collaboration_invites() from public;
revoke all on function public.accept_collaboration_invite_by_id(uuid) from public;
grant execute on function public.create_simple_collaboration_invite(uuid, text) to authenticated;
grant execute on function public.list_my_pending_collaboration_invites() to authenticated;
grant execute on function public.accept_collaboration_invite_by_id(uuid) to authenticated;
