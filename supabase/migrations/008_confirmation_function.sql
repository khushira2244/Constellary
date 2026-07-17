create or replace function public.confirm_branch_draft(draft_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
declare
  draft public.branch_drafts%rowtype;
  new_branch_id uuid;
  link_data jsonb;
  collaborator_data jsonb;
  ai_data jsonb;
  target_branch_id uuid;
  approved_short_summary_id uuid;
  raw_invite_token text;
  new_invite_id uuid;
  returned_invites jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into draft
  from public.branch_drafts
  where id = draft_id
  for update;

  if not found then
    raise exception 'Branch draft was not found';
  end if;

  if draft.creator_id <> auth.uid() then
    raise exception 'Only the draft creator can confirm this branch';
  end if;

  if draft.confirmed_branch_id is not null then
    return jsonb_build_object(
      'branch_id', draft.confirmed_branch_id,
      'already_confirmed', true,
      'invitations', '[]'::jsonb
    );
  end if;

  if nullif(btrim(draft.title), '') is null then
    raise exception 'Title is required';
  end if;
  if nullif(btrim(draft.original_idea), '') is null then
    raise exception 'Original idea is required';
  end if;
  if draft.origin_type is null then
    raise exception 'Origin is required';
  end if;
  if nullif(btrim(draft.short_summary), '') is null then
    raise exception 'Short summary is required';
  end if;

  if draft.parent_branch_id is not null
    and not public.can_view_branch(draft.parent_branch_id, auth.uid()) then
    raise exception 'Parent branch is unavailable';
  end if;

  for link_data in
    select value from jsonb_array_elements(draft.linked_branches_data)
  loop
    if jsonb_typeof(link_data) <> 'object' then
      raise exception 'Each linked branch entry must be an object';
    end if;

    target_branch_id := (link_data ->> 'target_branch_id')::uuid;
    if target_branch_id is null
      or not public.can_view_branch(target_branch_id, auth.uid()) then
      raise exception 'A linked branch is unavailable';
    end if;

    perform (link_data ->> 'relationship_type')::public.branch_relationship_type;
  end loop;

  insert into public.branches (
    owner_id,
    parent_branch_id,
    title,
    original_idea,
    origin_type,
    origin_details,
    status,
    privacy,
    language,
    original_idea_locked_at,
    confirmed_from_draft_id
  )
  values (
    draft.creator_id,
    draft.parent_branch_id,
    btrim(draft.title),
    btrim(draft.original_idea),
    draft.origin_type,
    draft.origin_details,
    'new',
    draft.privacy,
    draft.language,
    now(),
    draft.id
  )
  returning id into new_branch_id;

  insert into public.branch_collaborators (
    branch_id,
    user_id,
    role,
    access_scope,
    added_by
  )
  values (
    new_branch_id,
    draft.creator_id,
    'owner',
    'entire_branch',
    draft.creator_id
  );

  insert into public.branch_summaries (
    branch_id,
    summary_type,
    content,
    status,
    visibility,
    created_by,
    approved_by,
    approved_at
  )
  values (
    new_branch_id,
    'short',
    btrim(draft.short_summary),
    'approved',
    'inherit',
    draft.creator_id,
    draft.creator_id,
    now()
  )
  returning id into approved_short_summary_id;

  for link_data in
    select value from jsonb_array_elements(draft.linked_branches_data)
  loop
    target_branch_id := (link_data ->> 'target_branch_id')::uuid;

    insert into public.branch_links (
      source_branch_id,
      target_branch_id,
      relationship_type,
      relationship_note,
      imported_summary_id,
      created_by
    )
    values (
      new_branch_id,
      target_branch_id,
      (link_data ->> 'relationship_type')::public.branch_relationship_type,
      nullif(btrim(link_data ->> 'relationship_note'), ''),
      (
        select summary.id
        from public.branch_summaries summary
        where summary.branch_id = target_branch_id
          and summary.summary_type = 'short'
          and summary.status = 'approved'
          and summary.is_current
        order by summary.approved_at desc
        limit 1
      ),
      draft.creator_id
    );
  end loop;

  for collaborator_data in
    select value from jsonb_array_elements(draft.collaborators_data)
  loop
    if jsonb_typeof(collaborator_data) <> 'object' then
      raise exception 'Each collaborator entry must be an object';
    end if;

    if coalesce(collaborator_data ->> 'user_id', '') <> '' then
      if (collaborator_data ->> 'role')::public.collaborator_role = 'owner' then
        raise exception 'Additional collaborators cannot receive the owner role';
      end if;

      insert into public.branch_collaborators (
        branch_id,
        user_id,
        role,
        access_scope,
        added_by
      )
      values (
        new_branch_id,
        (collaborator_data ->> 'user_id')::uuid,
        (collaborator_data ->> 'role')::public.collaborator_role,
        coalesce(
          (collaborator_data ->> 'access_scope')::public.access_scope,
          'entire_branch'
        ),
        draft.creator_id
      )
      on conflict (branch_id, user_id) do nothing;
    elsif nullif(btrim(collaborator_data ->> 'email'), '') is not null then
      if (collaborator_data ->> 'role')::public.collaborator_role = 'owner' then
        raise exception 'Invited collaborators cannot receive the owner role';
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
        new_branch_id,
        draft.creator_id,
        lower(btrim(collaborator_data ->> 'email')),
        (collaborator_data ->> 'role')::public.collaborator_role,
        coalesce(
          (collaborator_data ->> 'access_scope')::public.access_scope,
          'entire_branch'
        ),
        encode(extensions.digest(raw_invite_token, 'sha256'), 'hex'),
        nullif(collaborator_data ->> 'expires_at', '')::timestamptz
      )
      returning id into new_invite_id;

      returned_invites := returned_invites || jsonb_build_array(
        jsonb_build_object(
          'invite_id', new_invite_id,
          'email', lower(btrim(collaborator_data ->> 'email')),
          'token', raw_invite_token
        )
      );
    else
      raise exception 'Collaborator entry requires a user_id or email';
    end if;
  end loop;

  for ai_data in
    select value from jsonb_array_elements(draft.ai_role_data)
  loop
    if jsonb_typeof(ai_data) <> 'object' then
      raise exception 'Each AI contribution entry must be an object';
    end if;

    insert into public.ai_contributions (
      branch_id,
      target_type,
      target_id,
      contribution_type,
      model_name,
      input_context_summary,
      generated_content,
      requested_by,
      approval_status,
      approved_by,
      approved_at
    )
    values (
      new_branch_id,
      'branch',
      new_branch_id,
      (ai_data ->> 'contribution_type')::public.ai_contribution_type,
      ai_data ->> 'model_name',
      ai_data ->> 'input_context_summary',
      coalesce(ai_data -> 'generated_content', '{}'::jsonb),
      draft.creator_id,
      coalesce(
        (ai_data ->> 'approval_status')::public.ai_approval_status,
        'generated'
      ),
      case
        when ai_data ->> 'approval_status' = 'approved' then draft.creator_id
        else null
      end,
      case
        when ai_data ->> 'approval_status' = 'approved' then now()
        else null
      end
    );
  end loop;

  insert into public.activity_events (
    branch_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values
    (
      new_branch_id,
      draft.creator_id,
      'branch_confirmed',
      'branch',
      new_branch_id,
      jsonb_build_object(
        'draft_id', draft.id,
        'parent_branch_id', draft.parent_branch_id
      )
    ),
    (
      new_branch_id,
      draft.creator_id,
      'original_idea_locked',
      'branch',
      new_branch_id,
      '{}'::jsonb
    ),
    (
      new_branch_id,
      draft.creator_id,
      'summary_created',
      'summary',
      approved_short_summary_id,
      jsonb_build_object('summary_type', 'short')
    );

  update public.branch_drafts
  set
    confirmed_branch_id = new_branch_id,
    confirmed_at = now()
  where id = draft.id;

  return jsonb_build_object(
    'branch_id', new_branch_id,
    'already_confirmed', false,
    'invitations', returned_invites
  );
end;
$function$;

revoke all on function public.confirm_branch_draft(uuid) from public;
grant execute on function public.confirm_branch_draft(uuid) to authenticated;
