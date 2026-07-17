create table public.branches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  parent_branch_id uuid references public.branches(id) on delete restrict,
  title text not null,
  original_idea text not null,
  origin_type public.branch_origin_type not null,
  origin_details jsonb not null default '{}'::jsonb,
  status public.branch_status not null default 'new',
  privacy public.privacy_level not null default 'private',
  language text not null default 'en',
  original_idea_locked_at timestamptz not null,
  confirmed_from_draft_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint branches_title_not_blank check (btrim(title) <> ''),
  constraint branches_original_idea_not_blank check (btrim(original_idea) <> ''),
  constraint branches_origin_details_object check (jsonb_typeof(origin_details) = 'object'),
  constraint branches_language_not_blank check (btrim(language) <> ''),
  constraint branches_not_own_parent check (parent_branch_id is null or parent_branch_id <> id),
  constraint branches_archive_consistency check (
    archived_at is null or status = 'archived_with_learning'
  )
);

create table public.branch_drafts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  parent_branch_id uuid references public.branches(id) on delete restrict,
  title text,
  original_idea text,
  origin_type public.branch_origin_type,
  origin_details jsonb not null default '{}'::jsonb,
  short_summary text,
  privacy public.privacy_level not null default 'private',
  language text not null default 'en',
  creation_progress jsonb not null default '{}'::jsonb,
  linked_branches_data jsonb not null default '[]'::jsonb,
  collaborators_data jsonb not null default '[]'::jsonb,
  ai_role_data jsonb not null default '[]'::jsonb,
  confirmed_branch_id uuid unique references public.branches(id) on delete restrict,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_drafts_origin_details_object check (jsonb_typeof(origin_details) = 'object'),
  constraint branch_drafts_progress_object check (jsonb_typeof(creation_progress) = 'object'),
  constraint branch_drafts_links_array check (jsonb_typeof(linked_branches_data) = 'array'),
  constraint branch_drafts_collaborators_array check (jsonb_typeof(collaborators_data) = 'array'),
  constraint branch_drafts_ai_roles_array check (jsonb_typeof(ai_role_data) = 'array'),
  constraint branch_drafts_language_not_blank check (btrim(language) <> ''),
  constraint branch_drafts_confirmation_consistency check (
    (confirmed_branch_id is null and confirmed_at is null)
    or
    (confirmed_branch_id is not null and confirmed_at is not null)
  )
);

alter table public.branches
  add constraint branches_confirmed_from_draft_fk
  foreign key (confirmed_from_draft_id)
  references public.branch_drafts(id)
  on delete restrict;

create index branches_owner_id_idx on public.branches (owner_id);
create index branches_parent_branch_id_idx on public.branches (parent_branch_id);
create index branches_status_idx on public.branches (status);
create index branches_privacy_idx on public.branches (privacy);
create index branches_updated_at_idx on public.branches (updated_at desc);
create index branches_public_updated_idx on public.branches (updated_at desc)
  where privacy = 'public';

create index branch_drafts_creator_id_idx on public.branch_drafts (creator_id);
create index branch_drafts_parent_branch_id_idx on public.branch_drafts (parent_branch_id);
create index branch_drafts_updated_at_idx on public.branch_drafts (updated_at desc);

create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

create trigger branch_drafts_set_updated_at
before update on public.branch_drafts
for each row execute function public.set_updated_at();

