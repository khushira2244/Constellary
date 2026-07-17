create or replace function public.create_collaboration_invite(
  requested_branch_id uuid,
  requested_invitee_email text,
  requested_role public.collaborator_role,
  requested_access_scope public.access_scope default 'entire_branch',
  requested_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
declare
  normalized_email text;
  raw_invite_token text;
  created_invite public.collaboration_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if not public.can_manage_branch(requested_branch_id, auth.uid()) then
    raise exception 'Only branch managers can create invitations';
  end if;

  normalized_email := lower(btrim(requested_invitee_email));
  if normalized_email = '' or normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid invitation email is required';
  end if;

  if requested_role = 'owner' then
    raise exception 'Invited collaborators cannot receive the owner role';
  end if;

  if requested_expires_at is not null and requested_expires_at <= now() then
    raise exception 'Invitation expiry must be in the future';
  end if;

  raw_invite_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.collaboration_invites (
    branch_id,
    inviter_id,
    invitee_email,
    role,
    access_scope,
    token_hash,
    expires_at
  )
  values (
    requested_branch_id,
    auth.uid(),
    normalized_email,
    requested_role,
    requested_access_scope,
    encode(extensions.digest(raw_invite_token, 'sha256'), 'hex'),
    requested_expires_at
  )
  returning * into created_invite;

  insert into public.activity_events (
    branch_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    requested_branch_id,
    auth.uid(),
    'collaborator_invited',
    'invitation',
    created_invite.id,
    jsonb_build_object(
      'email', normalized_email,
      'role', requested_role,
      'access_scope', requested_access_scope
    )
  );

  return jsonb_build_object(
    'invitation_id', created_invite.id,
    'branch_id', created_invite.branch_id,
    'email', created_invite.invitee_email,
    'role', created_invite.role,
    'access_scope', created_invite.access_scope,
    'expires_at', created_invite.expires_at,
    'token', raw_invite_token
  );
end;
$function$;

create or replace function public.decline_collaboration_invite(invite_token text)
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

  if invite.status = 'declined' and current_email = lower(invite.invitee_email) then
    return invite.branch_id;
  end if;

  if invite.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;

  if current_email = '' or current_email <> lower(invite.invitee_email) then
    raise exception 'Invitation belongs to another email address';
  end if;

  update public.collaboration_invites
  set status = 'declined'
  where id = invite.id;

  return invite.branch_id;
end;
$function$;

create or replace function public.revoke_collaboration_invite(invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
declare
  invite public.collaboration_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into invite
  from public.collaboration_invites
  where id = invitation_id
  for update;

  if not found then
    raise exception 'Invitation was not found';
  end if;

  if not public.can_manage_branch(invite.branch_id, auth.uid()) then
    raise exception 'Only branch managers can revoke invitations';
  end if;

  if invite.status = 'revoked' then
    return invite.branch_id;
  end if;

  if invite.status <> 'pending' then
    raise exception 'Only pending invitations can be revoked';
  end if;

  update public.collaboration_invites
  set status = 'revoked'
  where id = invite.id;

  return invite.branch_id;
end;
$function$;

revoke all on function public.create_collaboration_invite(
  uuid,
  text,
  public.collaborator_role,
  public.access_scope,
  timestamptz
) from public;
revoke all on function public.decline_collaboration_invite(text) from public;
revoke all on function public.revoke_collaboration_invite(uuid) from public;

grant execute on function public.create_collaboration_invite(
  uuid,
  text,
  public.collaborator_role,
  public.access_scope,
  timestamptz
) to authenticated;
grant execute on function public.decline_collaboration_invite(text) to authenticated;
grant execute on function public.revoke_collaboration_invite(uuid) to authenticated;
