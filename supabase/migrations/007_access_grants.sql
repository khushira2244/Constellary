create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  resource_type public.resource_type not null,
  resource_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission public.permission_type not null,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint access_grants_unique_permission unique (
    resource_type,
    resource_id,
    user_id,
    permission
  )
);

create index access_grants_branch_idx on public.access_grants (branch_id);
create index access_grants_user_idx on public.access_grants (user_id, expires_at);
create index access_grants_resource_idx
  on public.access_grants (resource_type, resource_id);

create or replace function public.validate_access_grant_target()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if new.resource_type = 'comment' then
    if not exists (
      select 1 from public.comments
      where id = new.resource_id and branch_id = new.branch_id
    ) then
      raise exception 'Access-grant comment does not belong to the selected branch';
    end if;
  elsif not public.validate_branch_target(
    new.branch_id,
    new.resource_type::text,
    new.resource_id
  ) then
    raise exception 'Access-grant resource does not belong to the selected branch';
  end if;

  return new;
end;
$function$;

create trigger access_grants_validate_target
before insert or update on public.access_grants
for each row execute function public.validate_access_grant_target();

revoke all on function public.validate_access_grant_target() from public;

