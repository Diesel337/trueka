-- Reserve items while a request is accepted and let either participant end a
-- negotiation that did not result in an exchange.

create or replace function public.trade_request_participant_update_is_safe(
  p_trade_request_id uuid,
  p_requester_id uuid,
  p_receiver_id uuid,
  p_requested_item_id uuid,
  p_message text,
  p_status text,
  p_rejection_reason text,
  p_requester_city_snapshot text,
  p_requester_state_snapshot text,
  p_receiver_city_snapshot text,
  p_receiver_state_snapshot text,
  p_is_cross_city boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_current public.trade_requests%rowtype;
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    return false;
  end if;

  select * into v_current
  from public.trade_requests
  where id = p_trade_request_id;

  if not found
    or v_actor_id not in (v_current.requester_id, v_current.receiver_id)
  then
    return false;
  end if;

  if p_requester_id <> v_current.requester_id
    or p_receiver_id <> v_current.receiver_id
    or p_requested_item_id <> v_current.requested_item_id
    or p_message is distinct from v_current.message
    or p_requester_city_snapshot <> v_current.requester_city_snapshot
    or p_requester_state_snapshot <> v_current.requester_state_snapshot
    or p_receiver_city_snapshot <> v_current.receiver_city_snapshot
    or p_receiver_state_snapshot <> v_current.receiver_state_snapshot
    or p_is_cross_city <> v_current.is_cross_city
  then
    return false;
  end if;

  if p_status = v_current.status then
    return p_rejection_reason is not distinct from v_current.rejection_reason;
  end if;

  if v_current.status not in ('pending', 'countered', 'accepted') then
    return false;
  end if;

  -- Ending a request is still allowed after a block because it closes the
  -- interaction. An accepted negotiation cannot be ended after either person
  -- has confirmed that the exchange happened.
  if p_status = 'cancelled' then
    if p_rejection_reason is not null then
      return false;
    end if;

    if v_current.status in ('pending', 'countered') then
      return v_actor_id = v_current.requester_id;
    end if;

    return v_current.status = 'accepted'
      and not exists (
        select 1
        from public.trade_completion_confirmations confirmation
        where confirmation.trade_request_id = p_trade_request_id
      );
  end if;

  if public.has_user_block_between(v_current.requester_id, v_current.receiver_id)
    or exists (
      select 1
      from public.profiles profile
      where profile.id = v_actor_id
        and profile.is_banned
    )
  then
    return false;
  end if;

  if p_status in ('accepted', 'rejected') then
    if v_actor_id <> v_current.receiver_id
      or v_current.status not in ('pending', 'countered')
    then
      return false;
    end if;

    if p_status = 'rejected' then
      return true;
    end if;

    return p_rejection_reason is null
      and exists (
        select 1
        from public.items requested
        where requested.id = v_current.requested_item_id
          and requested.status = 'active'
          and requested.moderation_status = 'active'
      )
      and not exists (
        select 1
        from public.trade_request_offered_items offered
        left join public.items item on item.id = offered.item_id
        where offered.trade_request_id = p_trade_request_id
          and (
            item.id is null
            or item.status <> 'active'
            or item.moderation_status <> 'active'
          )
      );
  end if;

  return false;
end;
$$;

create or replace function public.manage_trade_request_item_reservations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_involved_item_ids uuid[];
  v_item_count integer;
  v_available_count integer;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'accepted'
    or (
      old.status = 'accepted'
      and new.status in ('cancelled', 'expired')
    )
  then
    select coalesce(array_agg(involved.item_id order by involved.item_id), '{}'::uuid[])
    into v_involved_item_ids
    from (
      select new.requested_item_id as item_id
      union
      select offered.item_id
      from public.trade_request_offered_items offered
      where offered.trade_request_id = new.id
    ) involved;

    v_item_count := coalesce(array_length(v_involved_item_ids, 1), 0);

    if v_item_count < 2 then
      raise exception 'La solicitud debe incluir al menos un articulo ofrecido.';
    end if;

    perform 1
    from public.items item
    where item.id = any(v_involved_item_ids)
    order by item.id
    for update;
  end if;

  if new.status = 'accepted' then
    select count(*)
    into v_available_count
    from public.items item
    where item.id = any(v_involved_item_ids)
      and item.status = 'active'
      and item.moderation_status = 'active';

    if v_available_count <> v_item_count then
      raise exception 'Algun articulo de la propuesta ya no esta disponible.';
    end if;

    update public.items
    set status = 'reserved'
    where id = any(v_involved_item_ids);
  elsif old.status = 'accepted'
    and new.status in ('cancelled', 'expired')
  then
    if new.status = 'cancelled'
      and exists (
        select 1
        from public.trade_completion_confirmations confirmation
        where confirmation.trade_request_id = new.id
      )
    then
      raise exception 'La negociacion ya tiene una confirmacion de intercambio.';
    end if;

    update public.items item
    set status = 'active'
    where item.id = any(v_involved_item_ids)
      and item.status = 'reserved'
      and not exists (
        select 1
        from public.trade_requests other_request
        where other_request.id <> new.id
          and other_request.status = 'accepted'
          and (
            other_request.requested_item_id = item.id
            or exists (
              select 1
              from public.trade_request_offered_items other_offered
              where other_offered.trade_request_id = other_request.id
                and other_offered.item_id = item.id
            )
          )
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trade_requests_manage_item_reservations on public.trade_requests;
create trigger trade_requests_manage_item_reservations
after update of status on public.trade_requests
for each row execute function public.manage_trade_request_item_reservations();

-- Bring existing accepted negotiations into the reserved state. If legacy
-- requests overlap, cancellation only releases an item after no accepted
-- request still references it.
update public.items item
set status = 'reserved'
where item.status = 'active'
  and exists (
    select 1
    from public.trade_requests request
    where request.status = 'accepted'
      and (
        request.requested_item_id = item.id
        or exists (
          select 1
          from public.trade_request_offered_items offered
          where offered.trade_request_id = request.id
            and offered.item_id = item.id
        )
      )
  );

create or replace function public.notify_trade_request_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_recipient_id uuid;
  v_title text;
  v_body text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'countered' then
    perform public.insert_notification(
      new.requester_id,
      new.receiver_id,
      'message_received',
      'Contraoferta recibida',
      'La otra persona propuso una contraoferta. Revisala para aceptar o rechazar.',
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );
  elsif new.status = 'accepted' then
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
      coalesce(new.rejection_reason, 'La otra persona rechazo tu solicitud.'),
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );
  elsif new.status = 'cancelled' then
    v_title := case
      when old.status = 'accepted' then 'Negociacion terminada'
      else 'Solicitud cancelada'
    end;
    v_body := case
      when old.status = 'accepted' then
        'La otra persona termino la negociacion sin marcar el trueque como realizado.'
      else
        'La otra persona cancelo una solicitud de trueque.'
    end;

    if v_actor_id = new.requester_id then
      v_recipient_id := new.receiver_id;
    elsif v_actor_id = new.receiver_id then
      v_recipient_id := new.requester_id;
    else
      perform public.insert_notification(
        new.requester_id,
        v_actor_id,
        'trade_request_cancelled',
        v_title,
        v_body,
        '/requests/' || new.id::text,
        new.id,
        new.requested_item_id
      );
      perform public.insert_notification(
        new.receiver_id,
        v_actor_id,
        'trade_request_cancelled',
        v_title,
        v_body,
        '/requests/' || new.id::text,
        new.id,
        new.requested_item_id
      );
      return new;
    end if;

    perform public.insert_notification(
      v_recipient_id,
      v_actor_id,
      'trade_request_cancelled',
      v_title,
      v_body,
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
      'Ambas personas confirmaron que el intercambio si se hizo.',
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );

    perform public.insert_notification(
      new.receiver_id,
      new.requester_id,
      'trade_completed',
      'Trueque completado',
      'Ambas personas confirmaron que el intercambio si se hizo.',
      '/requests/' || new.id::text,
      new.id,
      new.requested_item_id
    );
  end if;

  return new;
end;
$$;

revoke all on function public.manage_trade_request_item_reservations() from public, anon, authenticated;
