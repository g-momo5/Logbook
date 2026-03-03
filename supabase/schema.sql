create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.procedure_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  procedure_kind text not null,
  procedure_label text not null,
  procedure_date date not null,
  operator_role text not null,
  card_summary text not null,
  access_site text,
  details jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.app_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  export_format text not null check (export_format in ('csv', 'json')),
  exported_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.procedure_entries enable row level security;
alter table public.app_exports enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "entries_select_own" on public.procedure_entries;
create policy "entries_select_own"
on public.procedure_entries
for select
using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.procedure_entries;
create policy "entries_insert_own"
on public.procedure_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.procedure_entries;
create policy "entries_update_own"
on public.procedure_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "exports_select_own" on public.app_exports;
create policy "exports_select_own"
on public.app_exports
for select
using (auth.uid() = user_id);

drop policy if exists "exports_insert_own" on public.app_exports;
create policy "exports_insert_own"
on public.app_exports
for insert
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
