create table public.featured_branches (
  user_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

create index featured_branches_user_position_idx
  on public.featured_branches (user_id, position, created_at);

alter table public.featured_branches enable row level security;

grant select, insert, update, delete on public.featured_branches to authenticated;
grant select, insert, update, delete on public.featured_branches to service_role;

create policy featured_branches_select_own
on public.featured_branches for select
to authenticated
using (user_id = auth.uid());

create policy featured_branches_insert_own_accessible
on public.featured_branches for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.can_view_branch(branch_id, auth.uid())
);

create policy featured_branches_update_own_accessible
on public.featured_branches for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.can_view_branch(branch_id, auth.uid())
);

create policy featured_branches_delete_own
on public.featured_branches for delete
to authenticated
using (user_id = auth.uid());
