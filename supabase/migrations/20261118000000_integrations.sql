-- Per-user OAuth connections for publishing. Tokens are only readable by edge functions (service role).
create table public.integrations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  platform      public.platform not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  account_id    text,
  account_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, platform)
);
create trigger integrations_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

alter table public.integrations enable row level security;
create policy "integrations: read own" on public.integrations
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "integrations: delete own" on public.integrations
  for delete to authenticated using (owner_id = (select auth.uid()));

-- clients can see that a connection exists, never the tokens
revoke select on public.integrations from authenticated;
grant select (id, owner_id, platform, account_name, expires_at, created_at) on public.integrations to authenticated;
