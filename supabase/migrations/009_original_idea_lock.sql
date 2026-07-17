create or replace function public.enforce_confirmed_branch_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if new.owner_id is distinct from old.owner_id
    or new.parent_branch_id is distinct from old.parent_branch_id
    or new.original_idea is distinct from old.original_idea
    or new.origin_type is distinct from old.origin_type
    or new.origin_details is distinct from old.origin_details
    or new.original_idea_locked_at is distinct from old.original_idea_locked_at
    or new.confirmed_from_draft_id is distinct from old.confirmed_from_draft_id then
    raise exception 'Confirmed branch identity, ancestry, original idea, and origin are immutable';
  end if;

  return new;
end;
$function$;

create trigger branches_lock_confirmed_identity
before update on public.branches
for each row execute function public.enforce_confirmed_branch_identity();

create or replace function public.prevent_confirmed_draft_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if old.confirmed_branch_id is not null and (
    new.creator_id is distinct from old.creator_id
    or new.parent_branch_id is distinct from old.parent_branch_id
    or new.title is distinct from old.title
    or new.original_idea is distinct from old.original_idea
    or new.origin_type is distinct from old.origin_type
    or new.origin_details is distinct from old.origin_details
    or new.short_summary is distinct from old.short_summary
    or new.privacy is distinct from old.privacy
    or new.language is distinct from old.language
    or new.creation_progress is distinct from old.creation_progress
    or new.linked_branches_data is distinct from old.linked_branches_data
    or new.collaborators_data is distinct from old.collaborators_data
    or new.ai_role_data is distinct from old.ai_role_data
    or new.confirmed_branch_id is distinct from old.confirmed_branch_id
    or new.confirmed_at is distinct from old.confirmed_at
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Confirmed drafts are immutable';
  end if;

  if old.confirmed_branch_id is not null and new.confirmed_branch_id is null then
    raise exception 'Draft confirmation cannot be reversed';
  end if;

  return new;
end;
$function$;

create trigger branch_drafts_lock_after_confirmation
before update on public.branch_drafts
for each row execute function public.prevent_confirmed_draft_changes();

create or replace function public.prevent_approved_summary_overwrite()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if old.status = 'approved' and (
    new.content is distinct from old.content
    or new.summary_type is distinct from old.summary_type
    or new.branch_id is distinct from old.branch_id
    or new.created_by is distinct from old.created_by
    or new.ai_contribution_id is distinct from old.ai_contribution_id
  ) then
    raise exception 'Approved summaries are immutable; create a new summary version';
  end if;

  return new;
end;
$function$;

create trigger branch_summaries_preserve_approved_content
before update on public.branch_summaries
for each row execute function public.prevent_approved_summary_overwrite();

revoke all on function public.enforce_confirmed_branch_identity() from public;
revoke all on function public.prevent_confirmed_draft_changes() from public;
revoke all on function public.prevent_approved_summary_overwrite() from public;
