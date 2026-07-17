create table public.branch_summaries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  summary_type public.summary_type not null,
  content text not null,
  status public.approval_status not null default 'draft',
  visibility public.content_visibility not null default 'inherit',
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_summaries_content_not_blank check (btrim(content) <> ''),
  constraint branch_summaries_approval_consistency check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or
    (status <> 'approved' and approved_at is null)
  )
);

create unique index branch_summaries_one_current_type_idx
  on public.branch_summaries (branch_id, summary_type)
  where is_current;
create index branch_summaries_branch_id_idx on public.branch_summaries (branch_id);
create index branch_summaries_status_idx on public.branch_summaries (status);

create table public.branch_links (
  id uuid primary key default gen_random_uuid(),
  source_branch_id uuid not null references public.branches(id) on delete cascade,
  target_branch_id uuid not null references public.branches(id) on delete restrict,
  relationship_type public.branch_relationship_type not null,
  relationship_note text,
  imported_summary_id uuid references public.branch_summaries(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint branch_links_not_self check (source_branch_id <> target_branch_id),
  constraint branch_links_unique_relationship unique (
    source_branch_id,
    target_branch_id,
    relationship_type
  )
);

create index branch_links_source_idx on public.branch_links (source_branch_id);
create index branch_links_target_idx on public.branch_links (target_branch_id);

create table public.workspace_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  parent_item_id uuid references public.workspace_items(id) on delete set null,
  item_type public.workspace_item_type not null,
  title text,
  content jsonb not null default '{}'::jsonb,
  visibility public.content_visibility not null default 'inherit',
  author_id uuid not null references public.profiles(id) on delete restrict,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workspace_items_content_object check (jsonb_typeof(content) = 'object'),
  constraint workspace_items_not_own_parent check (parent_item_id is null or parent_item_id <> id)
);

create index workspace_items_branch_idx on public.workspace_items (branch_id, position);
create index workspace_items_parent_idx on public.workspace_items (parent_item_id);
create index workspace_items_active_idx on public.workspace_items (branch_id, updated_at desc)
  where deleted_at is null;

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  source_type public.source_type not null,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  publication text,
  publication_year integer,
  url text,
  doi text,
  citation_text text,
  relationship_type text,
  description text,
  visibility public.content_visibility not null default 'inherit',
  added_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_title_not_blank check (btrim(title) <> ''),
  constraint sources_authors_array check (jsonb_typeof(authors) = 'array'),
  constraint sources_publication_year_reasonable check (
    publication_year is null or publication_year between 1000 and 9999
  ),
  constraint sources_has_locator check (
    url is not null or doi is not null or citation_text is not null
  )
);

create index sources_branch_idx on public.sources (branch_id);
create index sources_doi_idx on public.sources (lower(doi)) where doi is not null;
create index sources_title_idx on public.sources (title);

create trigger branch_summaries_set_updated_at
before update on public.branch_summaries
for each row execute function public.set_updated_at();

create trigger workspace_items_set_updated_at
before update on public.workspace_items
for each row execute function public.set_updated_at();

create trigger sources_set_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

create or replace function public.enforce_workspace_parent_branch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if new.parent_item_id is not null and not exists (
    select 1
    from public.workspace_items parent
    where parent.id = new.parent_item_id
      and parent.branch_id = new.branch_id
  ) then
    raise exception 'Parent Workspace item does not belong to the selected branch';
  end if;

  return new;
end;
$function$;

create trigger workspace_items_validate_parent_branch
before insert or update on public.workspace_items
for each row execute function public.enforce_workspace_parent_branch();

create or replace function public.validate_branch_link_summary()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if new.imported_summary_id is not null and not exists (
    select 1
    from public.branch_summaries summary
    where summary.id = new.imported_summary_id
      and summary.branch_id = new.target_branch_id
      and summary.status = 'approved'
      and summary.is_current
  ) then
    raise exception 'Imported summary must be the current approved summary of the target branch';
  end if;

  return new;
end;
$function$;

create trigger branch_links_validate_imported_summary
before insert or update on public.branch_links
for each row execute function public.validate_branch_link_summary();

revoke all on function public.validate_branch_link_summary() from public;
revoke all on function public.enforce_workspace_parent_branch() from public;
