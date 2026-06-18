-- Track user data deletion requests for admin follow-up.
-- This does not automatically delete accounts, trades, reports, messages, or moderation records.

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null check (position('@' in email) > 1),
  provider text not null default 'email' check (provider in ('email', 'google', 'facebook', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'completed', 'cancelled')),
  admin_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_deletion_requests_status_idx
on public.data_deletion_requests (status, created_at desc);

create index if not exists data_deletion_requests_user_idx
on public.data_deletion_requests (user_id, created_at desc);

create unique index if not exists data_deletion_requests_active_user_idx
on public.data_deletion_requests (user_id)
where user_id is not null and status in ('open', 'reviewing');

drop trigger if exists data_deletion_requests_touch_updated_at on public.data_deletion_requests;
create trigger data_deletion_requests_touch_updated_at
before update on public.data_deletion_requests
for each row execute function public.touch_updated_at();

alter table public.data_deletion_requests enable row level security;

drop policy if exists "users read own data deletion requests" on public.data_deletion_requests;
create policy "users read own data deletion requests" on public.data_deletion_requests
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users create own data deletion requests" on public.data_deletion_requests;
create policy "users create own data deletion requests" on public.data_deletion_requests
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "admins update data deletion requests" on public.data_deletion_requests;
create policy "admins update data deletion requests" on public.data_deletion_requests
for update using (public.is_admin()) with check (public.is_admin());

comment on table public.data_deletion_requests is
  'User-initiated requests to review and process personal data deletion manually.';
