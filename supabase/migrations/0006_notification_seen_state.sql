-- Separate "seen in the bell panel" from "opened/read".
-- The bell count uses seen_at; notification row styling still uses read_at.

alter table public.notifications
add column if not exists seen_at timestamptz;

create index if not exists notifications_unseen_idx
on public.notifications (recipient_id, seen_at, created_at desc);

update public.notifications
set seen_at = read_at
where seen_at is null
  and read_at is not null;
