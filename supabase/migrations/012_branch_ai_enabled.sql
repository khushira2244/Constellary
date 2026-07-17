alter table public.branches
  add column ai_enabled boolean not null default true;

comment on column public.branches.ai_enabled is
  'Whether new AI contribution workflows may be initiated for this branch.';
