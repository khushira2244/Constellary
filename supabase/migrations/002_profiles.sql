create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  headline text,
  discipline text,
  bio text,
  preferred_language text not null default 'en',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username = lower(username)
    and username ~ '^[a-z0-9][a-z0-9_-]{2,39}$'
  ),
  constraint profiles_display_name_not_blank check (btrim(display_name) <> ''),
  constraint profiles_language_not_blank check (btrim(preferred_language) <> '')
);

create index profiles_display_name_idx on public.profiles (display_name);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  base_username text;
begin
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1), 'researcher'),
      '[^a-zA-Z0-9_-]',
      '',
      'g'
    )
  );

  if length(base_username) < 3 then
    base_username := 'researcher';
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    left(base_username, 30) || '_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Researcher'),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$function$;

revoke all on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

