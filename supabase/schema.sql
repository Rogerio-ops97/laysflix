create table public.laysflix_user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  profile_kind text not null default 'standard' check (profile_kind in ('standard', 'lays')),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.laysflix_user_states enable row level security;
revoke all on table public.laysflix_user_states from anon;
grant select, insert, update, delete on table public.laysflix_user_states to authenticated;

create policy "Users can read their own LaysFlix state"
on public.laysflix_user_states for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own LaysFlix state"
on public.laysflix_user_states for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own LaysFlix state"
on public.laysflix_user_states for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own LaysFlix state"
on public.laysflix_user_states for delete to authenticated
using ((select auth.uid()) = user_id);
