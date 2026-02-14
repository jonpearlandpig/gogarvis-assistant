
create extension if not exists pgcrypto;

-- 1) PROFILE ROOT
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
revoke update, delete on public.user_profiles from anon, authenticated;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles for insert to authenticated
with check (user_id = auth.uid());

-- 2) PROFILE VERSIONS (append-only)
create table if not exists public.user_profile_versions (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  user_id uuid not null,
  version_number integer not null,
  config_json jsonb not null,
  telauthorium_id text unique not null,
  created_at timestamptz not null default now()
);

alter table public.user_profile_versions enable row level security;
revoke update, delete on public.user_profile_versions from anon, authenticated;

drop policy if exists "user_profile_versions_select_own" on public.user_profile_versions;
create policy "user_profile_versions_select_own"
on public.user_profile_versions for select to authenticated
using (user_id = auth.uid());

drop policy if exists "user_profile_versions_insert_own" on public.user_profile_versions;
create policy "user_profile_versions_insert_own"
on public.user_profile_versions for insert to authenticated
with check (user_id = auth.uid());

-- 3) BEFORE INSERT: version_number + TID
create or replace function public.user_profile_versions_before_insert()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  next_version integer;
begin
  if new.telauthorium_id is not null then
    raise exception 'Telauthorium ID is system-generated only.';
  end if;

  select coalesce(max(version_number),0) + 1
  into next_version
  from public.user_profile_versions
  where user_profile_id = new.user_profile_id;

  new.version_number := next_version;
  new.telauthorium_id := public.gen_telauthorium_id();

  return new;
end;
$$;

drop trigger if exists trg_user_profile_versions_before_insert on public.user_profile_versions;
create trigger trg_user_profile_versions_before_insert
before insert on public.user_profile_versions
for each row execute function public.user_profile_versions_before_insert();

-- 4) AFTER INSERT: ledger logging (SECURITY DEFINER for ledger insert)
create or replace function public.user_profile_versions_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.telauthorium_ledger (
    user_id,
    telauthorium_id,
    action,
    actor,
    context
  )
  values (
    new.user_id,
    new.telauthorium_id,
    'USER_PROFILE_UPDATED',
    'human',
    jsonb_build_object(
      'user_profile_id', new.user_profile_id,
      'version', new.version_number,
      'config', new.config_json
    )::text
  );

  return new;
end;
$$;

drop trigger if exists trg_user_profile_versions_after_insert on public.user_profile_versions;
create trigger trg_user_profile_versions_after_insert
after insert on public.user_profile_versions
for each row execute function public.user_profile_versions_after_insert();
