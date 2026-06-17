-- Basic anti-spam counters for repeated product actions.
-- Keeps the MVP as barter only: no payments, no money, no managed shipping or delivery.

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (
    action in (
      'trade_request_create',
      'trade_request_create_for_item',
      'message_send',
      'message_send_in_thread',
      'report_create',
      'report_create_for_target'
    )
  ),
  target_key text,
  created_at timestamptz not null default now(),
  check (target_key is null or char_length(target_key) <= 180)
);

create index if not exists rate_limit_events_user_action_target_created_idx
on public.rate_limit_events (user_id, action, target_key, created_at desc);

create index if not exists rate_limit_events_created_idx
on public.rate_limit_events (created_at);

alter table public.rate_limit_events enable row level security;

drop policy if exists "users read own rate limit events" on public.rate_limit_events;
create policy "users read own rate limit events" on public.rate_limit_events
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage rate limit events" on public.rate_limit_events;
create policy "admins manage rate limit events" on public.rate_limit_events
for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.consume_rate_limit(
  p_action text,
  p_window_seconds integer,
  p_max_events integer,
  p_target_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_key text := nullif(trim(p_target_key), '');
  v_event_count integer;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_window_seconds < 1 or p_window_seconds > 604800 then
    raise exception 'invalid rate limit window';
  end if;

  if p_max_events < 1 or p_max_events > 1000 then
    raise exception 'invalid rate limit max events';
  end if;

  delete from public.rate_limit_events
  where created_at < now() - interval '14 days';

  select count(*)
  into v_event_count
  from public.rate_limit_events
  where user_id = v_user_id
    and action = p_action
    and created_at >= now() - make_interval(secs => p_window_seconds)
    and (
      (v_target_key is null and target_key is null)
      or (v_target_key is not null and target_key = v_target_key)
    );

  if v_event_count >= p_max_events then
    return false;
  end if;

  insert into public.rate_limit_events (user_id, action, target_key)
  values (v_user_id, p_action, v_target_key);

  return true;
end;
$$;

grant execute on function public.consume_rate_limit(text, integer, integer, text) to authenticated;
