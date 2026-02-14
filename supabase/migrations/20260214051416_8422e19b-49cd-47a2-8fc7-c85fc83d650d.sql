
create extension if not exists pgcrypto;

-- 1) UPLOADS
create table if not exists public.akb_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid null,
  kind text not null,
  filename text null,
  mime_type text null,
  storage_path text null,
  size_bytes bigint null,
  sha256 text null,
  source_label text null,
  created_at timestamptz not null default now()
);
alter table public.akb_uploads enable row level security;
drop policy if exists "akb_uploads_select_own" on public.akb_uploads;
create policy "akb_uploads_select_own" on public.akb_uploads for select to authenticated using (user_id = auth.uid());
drop policy if exists "akb_uploads_insert_own" on public.akb_uploads;
create policy "akb_uploads_insert_own" on public.akb_uploads for insert to authenticated with check (user_id = auth.uid());

-- 2) EXTRACTIONS
create table if not exists public.akb_extractions (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.akb_uploads(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'queued',
  model text null,
  extracted_json jsonb null,
  confidence_score numeric null,
  error text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);
alter table public.akb_extractions enable row level security;
drop policy if exists "akb_extractions_select_own" on public.akb_extractions;
create policy "akb_extractions_select_own" on public.akb_extractions for select to authenticated using (user_id = auth.uid());
drop policy if exists "akb_extractions_insert_own" on public.akb_extractions;
create policy "akb_extractions_insert_own" on public.akb_extractions for insert to authenticated with check (user_id = auth.uid());

-- 3) DRAFTS
create table if not exists public.akb_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid null,
  domain text not null,
  title text not null,
  body_md text not null,
  tags text[] not null default '{}',
  sources jsonb not null default '[]',
  proposed_by text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
alter table public.akb_drafts enable row level security;
drop policy if exists "akb_drafts_select_own" on public.akb_drafts;
create policy "akb_drafts_select_own" on public.akb_drafts for select to authenticated using (user_id = auth.uid());
drop policy if exists "akb_drafts_insert_own" on public.akb_drafts;
create policy "akb_drafts_insert_own" on public.akb_drafts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "akb_drafts_update_own" on public.akb_drafts;
create policy "akb_drafts_update_own" on public.akb_drafts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) LAW (append-only)
create table if not exists public.akb_law (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid null,
  domain text not null,
  title text not null,
  body_md text not null,
  tags text[] not null default '{}',
  sources jsonb not null,
  authority jsonb not null,
  version_number integer not null,
  telauthorium_id text unique not null,
  created_at timestamptz not null default now()
);
alter table public.akb_law enable row level security;
revoke update, delete on public.akb_law from anon, authenticated;
drop policy if exists "akb_law_select_own" on public.akb_law;
create policy "akb_law_select_own" on public.akb_law for select to authenticated using (user_id = auth.uid());
drop policy if exists "akb_law_insert_own" on public.akb_law;
create policy "akb_law_insert_own" on public.akb_law for insert to authenticated with check (user_id = auth.uid());

create or replace function public.akb_law_before_insert()
returns trigger language plpgsql set search_path = public, extensions as $$
declare next_version integer;
begin
  if new.telauthorium_id is not null then raise exception 'telauthorium_id is system-generated only'; end if;
  if new.version_number is not null then raise exception 'version_number is system-generated only'; end if;
  if new.title is null or length(trim(new.title)) = 0 then raise exception 'LAW requires non-empty title'; end if;
  if new.body_md is null or length(trim(new.body_md)) = 0 then raise exception 'LAW requires non-empty body_md'; end if;
  if new.sources is null or jsonb_typeof(new.sources) <> 'array' or jsonb_array_length(new.sources) = 0 then raise exception 'LAW requires sources[] with at least one entry'; end if;
  if new.authority is null then raise exception 'LAW requires authority JSON'; end if;
  select coalesce(max(version_number),0) + 1 into next_version from public.akb_law where user_id = new.user_id and coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(new.workspace_id, '00000000-0000-0000-0000-000000000000'::uuid);
  new.version_number := next_version;
  new.telauthorium_id := public.gen_telauthorium_id();
  return new;
end;
$$;

drop trigger if exists trg_akb_law_before_insert on public.akb_law;
create trigger trg_akb_law_before_insert before insert on public.akb_law for each row execute function public.akb_law_before_insert();

create or replace function public.akb_law_after_insert()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.telauthorium_ledger (user_id, telauthorium_id, action, actor, context)
  values (new.user_id, new.telauthorium_id, 'LAW_PUBLISHED', 'human', jsonb_build_object('domain', new.domain, 'title', new.title, 'version_number', new.version_number, 'workspace_id', new.workspace_id, 'sources', new.sources, 'authority', new.authority));
  return new;
end;
$$;

drop trigger if exists trg_akb_law_after_insert on public.akb_law;
create trigger trg_akb_law_after_insert after insert on public.akb_law for each row execute function public.akb_law_after_insert();

-- 5) CANON (append-only)
create table if not exists public.akb_canon (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid null,
  key text not null,
  value_json jsonb not null,
  version_number integer not null,
  telauthorium_id text unique not null,
  created_at timestamptz not null default now()
);
alter table public.akb_canon enable row level security;
revoke update, delete on public.akb_canon from anon, authenticated;
drop policy if exists "akb_canon_select_own" on public.akb_canon;
create policy "akb_canon_select_own" on public.akb_canon for select to authenticated using (user_id = auth.uid());
drop policy if exists "akb_canon_insert_own" on public.akb_canon;
create policy "akb_canon_insert_own" on public.akb_canon for insert to authenticated with check (user_id = auth.uid());

create or replace function public.akb_canon_before_insert()
returns trigger language plpgsql set search_path = public, extensions as $$
declare next_version integer;
begin
  if new.telauthorium_id is not null then raise exception 'telauthorium_id is system-generated only'; end if;
  if new.version_number is not null then raise exception 'version_number is system-generated only'; end if;
  if new.key is null or length(trim(new.key)) = 0 then raise exception 'CANON requires non-empty key'; end if;
  select coalesce(max(version_number),0) + 1 into next_version from public.akb_canon where user_id = new.user_id and coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(new.workspace_id, '00000000-0000-0000-0000-000000000000'::uuid) and key = new.key;
  new.version_number := next_version;
  new.telauthorium_id := public.gen_telauthorium_id();
  return new;
end;
$$;

drop trigger if exists trg_akb_canon_before_insert on public.akb_canon;
create trigger trg_akb_canon_before_insert before insert on public.akb_canon for each row execute function public.akb_canon_before_insert();

create or replace function public.akb_canon_after_insert()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.telauthorium_ledger (user_id, telauthorium_id, action, actor, context)
  values (new.user_id, new.telauthorium_id, 'CANON_PUBLISHED', 'human', jsonb_build_object('key', new.key, 'version_number', new.version_number, 'value', new.value_json));
  return new;
end;
$$;

drop trigger if exists trg_akb_canon_after_insert on public.akb_canon;
create trigger trg_akb_canon_after_insert after insert on public.akb_canon for each row execute function public.akb_canon_after_insert();

-- 6) PROOF GATES
create table if not exists public.akb_proof_gates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid null,
  gate_name text not null,
  status text not null default 'fail',
  evidence_json jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.akb_proof_gates enable row level security;
drop policy if exists "akb_proof_gates_select_own" on public.akb_proof_gates;
create policy "akb_proof_gates_select_own" on public.akb_proof_gates for select to authenticated using (user_id = auth.uid());
drop policy if exists "akb_proof_gates_insert_own" on public.akb_proof_gates;
create policy "akb_proof_gates_insert_own" on public.akb_proof_gates for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "akb_proof_gates_update_own" on public.akb_proof_gates;
create policy "akb_proof_gates_update_own" on public.akb_proof_gates for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 7) CONFLICTS
create table if not exists public.akb_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid null,
  domain text not null,
  a_ref jsonb not null,
  b_ref jsonb not null,
  conflict_type text not null,
  notes text null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.akb_conflicts enable row level security;
drop policy if exists "akb_conflicts_select_own" on public.akb_conflicts;
create policy "akb_conflicts_select_own" on public.akb_conflicts for select to authenticated using (user_id = auth.uid());
drop policy if exists "akb_conflicts_insert_own" on public.akb_conflicts;
create policy "akb_conflicts_insert_own" on public.akb_conflicts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "akb_conflicts_update_own" on public.akb_conflicts;
create policy "akb_conflicts_update_own" on public.akb_conflicts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
