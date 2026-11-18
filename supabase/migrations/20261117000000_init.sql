-- CommitDev schema: profiles, repos, drafts (+ RLS, realtime, storage)

create type public.platform as enum ('linkedin', 'x', 'devto', 'hashnode');
create type public.draft_status as enum ('pending', 'ready', 'approved', 'rejected', 'published', 'failed');

-- helpers ---------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- profiles --------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  github_login text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, github_login, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- repos -----------------------------------------------------------------
create table public.repos (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  full_name         text not null check (full_name = lower(full_name) and full_name ~ '^[^/\s]+/[^/\s]+$'),
  default_tone      text not null default 'technical',
  default_platforms public.platform[] not null default '{linkedin,x}',
  -- per-repo HMAC secret for the GitHub webhook (owner can read it to configure the hook)
  webhook_secret    text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at        timestamptz not null default now(),
  unique (owner_id, full_name)
);
create index repos_full_name_idx on public.repos (full_name);

-- drafts ----------------------------------------------------------------
create table public.drafts (
  id             uuid primary key default gen_random_uuid(),
  repo_id        uuid not null references public.repos (id) on delete cascade,
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  commit_sha     text not null,
  commit_message text not null,
  commit_diff    text,                       -- redacted + truncated, kept for regeneration
  tags           jsonb not null default '{}',
  platform       public.platform not null,
  content        text,
  image_path     text,                       -- key inside the post-images bucket
  status         public.draft_status not null default 'pending',
  error          text,
  revision       int not null default 1,
  external_url   text,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- one draft per commit per platform: makes webhook + local git hook idempotent
  unique (repo_id, commit_sha, platform)
);
create index drafts_owner_created_idx on public.drafts (owner_id, created_at desc);
create trigger drafts_updated_at before update on public.drafts
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.repos    enable row level security;
alter table public.drafts   enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "repos: read own" on public.repos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "repos: insert own" on public.repos
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "repos: update own" on public.repos
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "repos: delete own" on public.repos
  for delete to authenticated using (owner_id = (select auth.uid()));

-- drafts are created by edge functions (service role); clients only review them
create policy "drafts: read own" on public.drafts
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "drafts: review own" on public.drafts
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and status in ('ready', 'approved', 'rejected'));
create policy "drafts: delete own" on public.drafts
  for delete to authenticated using (owner_id = (select auth.uid()));

-- clients may only touch these columns
revoke update on public.drafts from authenticated;
grant update (content, status, image_path) on public.drafts to authenticated;
revoke update on public.repos from authenticated;
grant update (default_tone, default_platforms) on public.repos to authenticated;

-- Realtime ---------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.drafts;
  end if;
end $$;

-- Storage: private bucket for post images, one folder per user -----------
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', false)
on conflict (id) do nothing;

create policy "post-images: own folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
