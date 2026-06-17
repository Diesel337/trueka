-- Trueka notifications and two-party trade completion confirmations.
-- A trade is only completed for stats after both participants confirm it happened.
-- No payment, shipping, delivery, escrow, or money fields are introduced here.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (
    type in (
      'trade_request_received',
      'trade_request_accepted',
      'trade_request_rejected',
      'trade_request_cancelled',
      'message_received',
      'trade_completion_confirmed',
      'trade_completed',
      'item_interest_match',
      'item_view_summary'
    )
  ),
  title text not null,
  body text,
  href text not null,
  trade_request_id uuid references public.trade_requests(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (recipient_id <> actor_id or actor_id is null)
);

create index if not exists notifications_recipient_idx
on public.notifications (recipient_id, read_at, created_at desc);

create index if not exists notifications_trade_request_idx
on public.notifications (trade_request_id);

create table if not exists public.trade_completion_confirmations (
  trade_request_id uuid not null references public.trade_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (trade_request_id, user_id)
);

create index if not exists trade_completion_confirmations_user_idx
on public.trade_completion_confirmations (user_id, confirmed_at desc);

alter table public.notifications enable row level security;
alter table public.trade_completion_confirmations enable row level security;

drop policy if exists "users see own notifications" on public.notifications;
create policy "users see own notifications" on public.notifications
for select using (recipient_id = auth.uid() or public.is_admin());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
for update using (recipient_id = auth.uid() or public.is_admin())
with check (recipient_id = auth.uid() or public.is_admin());

drop policy if exists "participants see completion confirmations" on public.trade_completion_confirmations;
create policy "participants see completion confirmations" on public.trade_completion_confirmations
for select using (
  exists (
    select 1
    from public.trade_requests tr
    where tr.id = trade_request_id
      and (tr.requester_id = auth.uid() or tr.receiver_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "participants confirm own completion" on public.trade_completion_confirmations;
create policy "participants confirm own completion" on public.trade_completion_confirmations
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.trade_requests tr
    where tr.id = trade_request_id
      and tr.status = 'accepted'
      and (tr.requester_id = auth.uid() or tr.receiver_id = auth.uid())
  )
);

create or replace function public.insert_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_href text,
  p_trade_request_id uuid default null,
  p_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  if p_recipient_id is null or p_recipient_id = p_actor_id then
    return null;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    href,
    trade_request_id,
    item_id
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_title,
    p_body,
    p_href,
    p_trade_request_id,
    p_item_id
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.insert_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid
) from public;

create or replace function public.notify_trade_request_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_title text;
  v_requester_name text;
begin
  select title into v_item_title
  from public.items
  where id = new.requested_item_id;

  select display_name into v_requester_name
  from public.profiles
  where id = new.requester_id;

  perform public.insert_notification(
    new.receiver_id,
    new.requester_id,
    'trade_request_received',
    'Nueva solicitud de trueque',
    coalesce(v_requester_name, 'Alguien') || ' quiere truequear por "' || coalesce(v_item_title, 'tu artículo') || '".',
    '/requests/' || new.id::text,
    new.id,
    new.requested_item_id
  );

  return new;
end;
$$;

drop trigger if exists trade_requests_notify_created on public.trade_requests;
create trigger trade_requests_notify_created
after insert on public.trade_requests
for each row execute function public.notify_trade_request_created();

create or replace function public.notify_trade_request_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'accepted' then
    perform public.insert_notification(
      new.requester_id,
      new.receiver_id,
      'trade_request_accepted',
      'Solicitud aceptada',
      'Tu solicitud fue aceptada. Ya pueden acordar el intercambio en el chat.',
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );
  elsif new.status = 'rejected' then
    perform public.insert_notification(
      new.requester_id,
      new.receiver_id,
      'trade_request_rejected',
      'Solicitud rechazada',
      coalesce(new.rejection_reason, 'La otra persona rechazó tu solicitud.'),
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );
  elsif new.status = 'cancelled' then
    perform public.insert_notification(
      new.receiver_id,
      new.requester_id,
      'trade_request_cancelled',
      'Solicitud cancelada',
      'La otra persona canceló una solicitud de trueque.',
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );
  elsif new.status = 'completed' then
    perform public.insert_notification(
      new.requester_id,
      new.receiver_id,
      'trade_completed',
      'Trueque completado',
      'Ambas personas confirmaron que el intercambio sí se hizo.',
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );

    perform public.insert_notification(
      new.receiver_id,
      new.requester_id,
      'trade_completed',
      'Trueque completado',
      'Ambas personas confirmaron que el intercambio sí se hizo.',
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trade_requests_notify_status_changed on public.trade_requests;
create trigger trade_requests_notify_status_changed
after update of status on public.trade_requests
for each row execute function public.notify_trade_request_status_changed();

create or replace function public.notify_message_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.trade_requests%rowtype;
  v_recipient_id uuid;
begin
  select * into v_request
  from public.trade_requests
  where id = new.trade_request_id;

  if not found then
    return new;
  end if;

  v_recipient_id := case
    when new.sender_id = v_request.requester_id then v_request.receiver_id
    else v_request.requester_id
  end;

  perform public.insert_notification(
    v_recipient_id,
    new.sender_id,
    'message_received',
    'Mensaje nuevo',
    'Te escribieron sobre una solicitud de trueque.',
    '/requests/' || new.trade_request_id::text,
    new.trade_request_id,
    v_request.requested_item_id
  );

  return new;
end;
$$;

drop trigger if exists messages_notify_created on public.messages;
create trigger messages_notify_created
after insert on public.messages
for each row execute function public.notify_message_created();

create or replace function public.confirm_trade_request_completion(p_trade_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.trade_requests%rowtype;
  v_other_user_id uuid;
  v_confirmation_count integer;
  v_involved_item_ids uuid[];
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para confirmar un trueque.';
  end if;

  select * into v_request
  from public.trade_requests
  where id = p_trade_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.';
  end if;

  if v_actor_id not in (v_request.requester_id, v_request.receiver_id) then
    raise exception 'No puedes confirmar esta solicitud.';
  end if;

  if v_request.status = 'completed' then
    return 'completed';
  end if;

  if v_request.status <> 'accepted' then
    raise exception 'Solo puedes confirmar un trueque aceptado.';
  end if;

  insert into public.trade_completion_confirmations (trade_request_id, user_id)
  values (p_trade_request_id, v_actor_id)
  on conflict (trade_request_id, user_id) do nothing;

  select count(*) into v_confirmation_count
  from public.trade_completion_confirmations
  where trade_request_id = p_trade_request_id
    and user_id in (v_request.requester_id, v_request.receiver_id);

  if v_confirmation_count < 2 then
    v_other_user_id := case
      when v_actor_id = v_request.requester_id then v_request.receiver_id
      else v_request.requester_id
    end;

    perform public.insert_notification(
      v_other_user_id,
      v_actor_id,
      'trade_completion_confirmed',
      'Confirma si el trueque sí se hizo',
      'La otra persona marcó que el intercambio sí se hizo. Confirma solo si tú también lo realizaste.',
      '/requests/' || p_trade_request_id::text,
      p_trade_request_id,
      v_request.requested_item_id
    );

    return 'waiting';
  end if;

  select array_agg(item_id) into v_involved_item_ids
  from (
    select v_request.requested_item_id as item_id
    union
    select offered.item_id
    from public.trade_request_offered_items offered
    where offered.trade_request_id = p_trade_request_id
  ) involved;

  perform 1
  from public.items i
  where i.id = any(v_involved_item_ids)
    and i.status in ('active', 'reserved')
    and i.moderation_status = 'active'
  for update;

  if (
    select count(*)
    from public.items i
    where i.id = any(v_involved_item_ids)
      and i.status in ('active', 'reserved')
      and i.moderation_status = 'active'
  ) <> array_length(v_involved_item_ids, 1) then
    raise exception 'Algún artículo ya no está disponible para completar este trueque.';
  end if;

  update public.items
  set status = 'traded'
  where id = any(v_involved_item_ids);

  update public.trade_requests
  set status = 'completed'
  where id = p_trade_request_id;

  update public.trade_requests tr
  set status = 'expired'
  where tr.id <> p_trade_request_id
    and tr.status in ('pending', 'accepted', 'countered')
    and (
      tr.requested_item_id = any(v_involved_item_ids)
      or exists (
        select 1
        from public.trade_request_offered_items offered
        where offered.trade_request_id = tr.id
          and offered.item_id = any(v_involved_item_ids)
      )
    );

  update public.profiles
  set completed_trades_count = completed_trades_count + 1
  where id in (v_request.requester_id, v_request.receiver_id);

  return 'completed';
end;
$$;

create or replace function public.complete_trade_request(p_trade_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.confirm_trade_request_completion(p_trade_request_id);
end;
$$;
