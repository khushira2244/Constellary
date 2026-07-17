create or replace function public.has_resource_permission(
  requested_resource_type public.resource_type,
  requested_resource_id uuid,
  requested_permission public.permission_type,
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
    from public.access_grants grant_row
    where grant_row.resource_type = requested_resource_type
      and grant_row.resource_id = requested_resource_id
      and grant_row.user_id = requested_user_id
      and (grant_row.expires_at is null or grant_row.expires_at > now())
      and (
        grant_row.permission = requested_permission
        or grant_row.permission = 'manage'
        or (requested_permission = 'view' and grant_row.permission in ('comment', 'edit', 'review'))
        or (requested_permission = 'comment' and grant_row.permission in ('edit', 'review'))
      )
  );
$function$;

create or replace function public.can_view_content(
  requested_branch_id uuid,
  requested_visibility public.content_visibility,
  requested_resource_type public.resource_type,
  requested_resource_id uuid,
  requested_creator_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
begin
  if public.can_manage_branch(requested_branch_id, requested_user_id)
    or requested_creator_id = requested_user_id then
    return true;
  end if;

  if public.has_resource_permission(
    requested_resource_type,
    requested_resource_id,
    'view',
    requested_user_id
  ) then
    return true;
  end if;

  if not public.can_view_branch(requested_branch_id, requested_user_id) then
    return false;
  end if;

  if requested_visibility in ('inherit', 'public') then
    return true;
  end if;

  if requested_visibility = 'branch_members' then
    return public.is_branch_member(requested_branch_id, requested_user_id);
  end if;

  return public.has_resource_permission(
    requested_resource_type,
    requested_resource_id,
    'view',
    requested_user_id
  );
end;
$function$;

create or replace function public.can_view_comment_target(
  requested_branch_id uuid,
  requested_target_type public.comment_target_type,
  requested_target_id uuid,
  requested_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $function$
declare
  allowed boolean;
begin
  if requested_target_type = 'branch' then
    return public.can_view_branch(requested_branch_id, requested_user_id);
  elsif requested_target_type = 'summary' then
    select public.can_view_content(
      summary.branch_id,
      summary.visibility,
      'summary',
      summary.id,
      summary.created_by,
      requested_user_id
    )
    into allowed
    from public.branch_summaries summary
    where summary.id = requested_target_id
      and summary.branch_id = requested_branch_id;
  elsif requested_target_type = 'workspace_item' then
    select public.can_view_content(
      item.branch_id,
      item.visibility,
      'workspace_item',
      item.id,
      item.author_id,
      requested_user_id
    )
    into allowed
    from public.workspace_items item
    where item.id = requested_target_id
      and item.branch_id = requested_branch_id;
  elsif requested_target_type = 'source' then
    select public.can_view_content(
      source.branch_id,
      source.visibility,
      'source',
      source.id,
      source.added_by,
      requested_user_id
    )
    into allowed
    from public.sources source
    where source.id = requested_target_id
      and source.branch_id = requested_branch_id;
  elsif requested_target_type = 'file' then
    select public.can_view_content(
      stored_file.branch_id,
      stored_file.visibility,
      'file',
      stored_file.id,
      stored_file.uploaded_by,
      requested_user_id
    )
    into allowed
    from public.files stored_file
    where stored_file.id = requested_target_id
      and stored_file.branch_id = requested_branch_id
      and stored_file.deleted_at is null;
  end if;

  return coalesce(allowed, false);
end;
$function$;

revoke all on function public.has_resource_permission(
  public.resource_type,
  uuid,
  public.permission_type,
  uuid
) from public;
revoke all on function public.can_view_content(
  uuid,
  public.content_visibility,
  public.resource_type,
  uuid,
  uuid,
  uuid
) from public;
revoke all on function public.can_view_comment_target(
  uuid,
  public.comment_target_type,
  uuid,
  uuid
) from public;
grant execute on function public.has_resource_permission(
  public.resource_type,
  uuid,
  public.permission_type,
  uuid
) to authenticated;
grant execute on function public.can_view_content(
  uuid,
  public.content_visibility,
  public.resource_type,
  uuid,
  uuid,
  uuid
) to anon, authenticated;
grant execute on function public.can_view_comment_target(
  uuid,
  public.comment_target_type,
  uuid,
  uuid
) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.branch_drafts enable row level security;
alter table public.branches enable row level security;
alter table public.branch_links enable row level security;
alter table public.branch_summaries enable row level security;
alter table public.workspace_items enable row level security;
alter table public.sources enable row level security;
alter table public.branch_collaborators enable row level security;
alter table public.collaboration_invites enable row level security;
alter table public.comments enable row level security;
alter table public.ai_contributions enable row level security;
alter table public.files enable row level security;
alter table public.activity_events enable row level security;
alter table public.access_grants enable row level security;

grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;

grant select, insert, update, delete
on public.branch_drafts
to authenticated;

grant select on public.branches to anon, authenticated;
grant update, delete on public.branches to authenticated;

grant select on
  public.branch_links,
  public.branch_summaries,
  public.workspace_items,
  public.sources,
  public.comments,
  public.files,
  public.activity_events
to anon, authenticated;

grant insert, update, delete on
  public.branch_links,
  public.branch_summaries,
  public.workspace_items,
  public.sources,
  public.comments,
  public.files
to authenticated;

grant select, insert, update, delete on
  public.branch_collaborators,
  public.collaboration_invites,
  public.ai_contributions,
  public.access_grants
to authenticated;

grant insert on public.activity_events to authenticated;

create policy profiles_public_read
on public.profiles for select
using (true);

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy drafts_select_own
on public.branch_drafts for select
to authenticated
using (creator_id = auth.uid());

create policy drafts_insert_own
on public.branch_drafts for insert
to authenticated
with check (
  creator_id = auth.uid()
  and (
    parent_branch_id is null
    or public.can_view_branch(parent_branch_id, auth.uid())
  )
);

create policy drafts_update_own_unconfirmed
on public.branch_drafts for update
to authenticated
using (creator_id = auth.uid() and confirmed_branch_id is null)
with check (
  creator_id = auth.uid()
  and (
    parent_branch_id is null
    or public.can_view_branch(parent_branch_id, auth.uid())
  )
);

create policy drafts_delete_own_unconfirmed
on public.branch_drafts for delete
to authenticated
using (creator_id = auth.uid() and confirmed_branch_id is null);

create policy branches_select_accessible
on public.branches for select
using (public.can_view_branch(id, auth.uid()));

create policy branches_update_editors
on public.branches for update
to authenticated
using (public.can_edit_branch(id, auth.uid()))
with check (public.can_edit_branch(id, auth.uid()));

create policy branches_delete_owner
on public.branches for delete
to authenticated
using (owner_id = auth.uid());

create policy branch_links_select_accessible
on public.branch_links for select
using (
  public.can_view_branch(source_branch_id, auth.uid())
  and public.can_view_branch(target_branch_id, auth.uid())
);

create policy branch_links_insert_editors
on public.branch_links for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.can_edit_branch(source_branch_id, auth.uid())
  and public.can_view_branch(target_branch_id, auth.uid())
);

create policy branch_links_update_editors
on public.branch_links for update
to authenticated
using (public.can_edit_branch(source_branch_id, auth.uid()))
with check (
  public.can_edit_branch(source_branch_id, auth.uid())
  and public.can_view_branch(target_branch_id, auth.uid())
);

create policy branch_links_delete_editors
on public.branch_links for delete
to authenticated
using (public.can_edit_branch(source_branch_id, auth.uid()));

create policy summaries_select_visible
on public.branch_summaries for select
using (
  public.can_view_content(
    branch_id,
    visibility,
    'summary',
    id,
    created_by,
    auth.uid()
  )
);

create policy summaries_insert_editors
on public.branch_summaries for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.can_edit_branch(branch_id, auth.uid())
  and (
    status <> 'approved'
    or approved_by = auth.uid()
  )
);

create policy summaries_update_editors
on public.branch_summaries for update
to authenticated
using (public.can_edit_branch(branch_id, auth.uid()))
with check (
  public.can_edit_branch(branch_id, auth.uid())
  and (
    status <> 'approved'
    or approved_by = auth.uid()
  )
);

create policy summaries_delete_editors
on public.branch_summaries for delete
to authenticated
using (public.can_edit_branch(branch_id, auth.uid()));

create policy workspace_items_select_visible
on public.workspace_items for select
using (
  public.can_view_content(
    branch_id,
    visibility,
    'workspace_item',
    id,
    author_id,
    auth.uid()
  )
);

create policy workspace_items_insert_editors
on public.workspace_items for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.can_edit_branch(branch_id, auth.uid())
);

create policy workspace_items_update_author_or_editors
on public.workspace_items for update
to authenticated
using (
  author_id = auth.uid()
  or public.can_edit_branch(branch_id, auth.uid())
)
with check (public.can_edit_branch(branch_id, auth.uid()));

create policy workspace_items_delete_author_or_editors
on public.workspace_items for delete
to authenticated
using (
  author_id = auth.uid()
  or public.can_edit_branch(branch_id, auth.uid())
);

create policy sources_select_visible
on public.sources for select
using (
  public.can_view_content(
    branch_id,
    visibility,
    'source',
    id,
    added_by,
    auth.uid()
  )
);

create policy sources_insert_editors
on public.sources for insert
to authenticated
with check (
  added_by = auth.uid()
  and public.can_edit_branch(branch_id, auth.uid())
);

create policy sources_update_editors
on public.sources for update
to authenticated
using (public.can_edit_branch(branch_id, auth.uid()))
with check (public.can_edit_branch(branch_id, auth.uid()));

create policy sources_delete_editors
on public.sources for delete
to authenticated
using (public.can_edit_branch(branch_id, auth.uid()));

create policy collaborators_select_members
on public.branch_collaborators for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_view_branch(branch_id, auth.uid())
);

create policy collaborators_manage_owner
on public.branch_collaborators for all
to authenticated
using (public.can_manage_branch(branch_id, auth.uid()))
with check (public.can_manage_branch(branch_id, auth.uid()));

create policy invites_select_related
on public.collaboration_invites for select
to authenticated
using (
  inviter_id = auth.uid()
  or invitee_user_id = auth.uid()
  or lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.can_manage_branch(branch_id, auth.uid())
);

create policy invites_insert_managers
on public.collaboration_invites for insert
to authenticated
with check (
  inviter_id = auth.uid()
  and public.can_manage_branch(branch_id, auth.uid())
);

create policy invites_update_managers
on public.collaboration_invites for update
to authenticated
using (public.can_manage_branch(branch_id, auth.uid()))
with check (public.can_manage_branch(branch_id, auth.uid()));

create policy invites_delete_managers
on public.collaboration_invites for delete
to authenticated
using (public.can_manage_branch(branch_id, auth.uid()));

create policy comments_select_visible
on public.comments for select
using (
  public.can_view_comment_target(
    branch_id,
    target_type,
    target_id,
    auth.uid()
  )
  and
  public.can_view_content(
    branch_id,
    visibility,
    'comment',
    id,
    author_id,
    auth.uid()
  )
);

create policy comments_insert_allowed
on public.comments for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.can_view_branch(branch_id, auth.uid())
  and public.can_view_comment_target(
    branch_id,
    target_type,
    target_id,
    auth.uid()
  )
  and (
    public.can_comment_branch(branch_id, auth.uid())
    or public.has_resource_permission('branch', branch_id, 'comment', auth.uid())
  )
);

create policy comments_update_author_or_editors
on public.comments for update
to authenticated
using (
  author_id = auth.uid()
  or public.can_edit_branch(branch_id, auth.uid())
)
with check (
  author_id = auth.uid()
  or public.can_edit_branch(branch_id, auth.uid())
);

create policy comments_delete_author_or_editors
on public.comments for delete
to authenticated
using (
  author_id = auth.uid()
  or public.can_edit_branch(branch_id, auth.uid())
);

create policy ai_contributions_select_members
on public.ai_contributions for select
to authenticated
using (
  requested_by = auth.uid()
  or public.is_branch_member(branch_id, auth.uid())
);

create policy ai_contributions_insert_requester
on public.ai_contributions for insert
to authenticated
with check (
  requested_by = auth.uid()
  and public.can_edit_branch(branch_id, auth.uid())
  and approval_status in ('generated', 'edited')
);

create policy ai_contributions_update_owner_or_requester
on public.ai_contributions for update
to authenticated
using (
  requested_by = auth.uid()
  or public.can_manage_branch(branch_id, auth.uid())
)
with check (
  (
    requested_by = auth.uid()
    or public.can_manage_branch(branch_id, auth.uid())
  )
  and (
    approval_status <> 'approved'
    or approved_by = auth.uid()
  )
);

create policy files_select_visible
on public.files for select
using (
  deleted_at is null
  and public.can_view_content(
    branch_id,
    visibility,
    'file',
    id,
    uploaded_by,
    auth.uid()
  )
);

create policy files_insert_editors
on public.files for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.can_edit_branch(branch_id, auth.uid())
);

create policy files_update_uploader_or_editors
on public.files for update
to authenticated
using (
  uploaded_by = auth.uid()
  or public.can_edit_branch(branch_id, auth.uid())
)
with check (public.can_edit_branch(branch_id, auth.uid()));

create policy files_delete_uploader_or_editors
on public.files for delete
to authenticated
using (
  uploaded_by = auth.uid()
  or public.can_edit_branch(branch_id, auth.uid())
);

create policy activity_events_select_members
on public.activity_events for select
using (
  public.can_view_content(
    branch_id,
    visibility,
    'activity_event',
    id,
    actor_id,
    auth.uid()
  )
);

create policy activity_events_insert_actor
on public.activity_events for insert
to authenticated
with check (
  actor_id = auth.uid()
  and public.is_branch_member(branch_id, auth.uid())
);

create policy access_grants_select_related
on public.access_grants for select
to authenticated
using (
  user_id = auth.uid()
  or granted_by = auth.uid()
  or public.can_manage_branch(branch_id, auth.uid())
);

create policy access_grants_insert_managers
on public.access_grants for insert
to authenticated
with check (
  granted_by = auth.uid()
  and public.can_manage_branch(branch_id, auth.uid())
);

create policy access_grants_update_managers
on public.access_grants for update
to authenticated
using (public.can_manage_branch(branch_id, auth.uid()))
with check (public.can_manage_branch(branch_id, auth.uid()));

create policy access_grants_delete_managers
on public.access_grants for delete
to authenticated
using (public.can_manage_branch(branch_id, auth.uid()));
