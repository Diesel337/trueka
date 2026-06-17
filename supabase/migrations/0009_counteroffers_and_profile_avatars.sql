-- Counteroffers and profile avatars.
-- Counteroffers remain item-for-item only: no payment, money, shipping, delivery, or escrow fields.

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "profile avatars are publicly readable" on storage.objects;
drop policy if exists "authenticated users upload profile avatars" on storage.objects;
drop policy if exists "owners update profile avatars" on storage.objects;
drop policy if exists "owners delete profile avatars" on storage.objects;

create policy "profile avatars are publicly readable"
on storage.objects for select
using (bucket_id = 'profile-avatars');

create policy "authenticated users upload profile avatars"
on storage.objects for insert
with check (bucket_id = 'profile-avatars' and auth.role() = 'authenticated');

create policy "owners update profile avatars"
on storage.objects for update
using (bucket_id = 'profile-avatars' and owner = auth.uid())
with check (bucket_id = 'profile-avatars' and owner = auth.uid());

create policy "owners delete profile avatars"
on storage.objects for delete
using (bucket_id = 'profile-avatars' and owner = auth.uid());

create or replace function public.create_trade_counteroffer(
  p_trade_request_id uuid,
  p_requested_offered_item_ids uuid[],
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.trade_requests%rowtype;
  v_counteroffer_id uuid;
  v_distinct_item_count integer;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para crear una contraoferta.';
  end if;

  select * into v_request
  from public.trade_requests
  where id = p_trade_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.';
  end if;

  if v_actor_id <> v_request.receiver_id then
    raise exception 'Solo quien recibió la solicitud puede proponer una contraoferta.';
  end if;

  if v_request.status not in ('pending', 'countered') then
    raise exception 'Esta solicitud ya no acepta contraofertas.';
  end if;

  if public.has_user_block_between(v_request.requester_id, v_request.receiver_id) then
    raise exception 'No puedes interactuar con este usuario.';
  end if;

  if p_requested_offered_item_ids is null or array_length(p_requested_offered_item_ids, 1) is null then
    raise exception 'Elige al menos un artículo para la contraoferta.';
  end if;

  select count(distinct item_id) into v_distinct_item_count
  from unnest(p_requested_offered_item_ids) as selected(item_id);

  if v_distinct_item_count <> array_length(p_requested_offered_item_ids, 1) then
    raise exception 'No repitas artículos en la misma contraoferta.';
  end if;

  perform 1
  from public.items i
  where i.id = v_request.requested_item_id
    and i.owner_id = v_request.receiver_id
    and i.status = 'active'
    and i.moderation_status = 'active'
  for update;

  if not found then
    raise exception 'Tu artículo ya no está disponible para contraofertar.';
  end if;

  if exists (
    select 1
    from unnest(p_requested_offered_item_ids) as selected(requested_item_id)
    left join public.items i on i.id = selected.requested_item_id
    where i.id is null
       or i.owner_id <> v_request.requester_id
       or i.status <> 'active'
       or i.moderation_status <> 'active'
  ) then
    raise exception 'Solo puedes pedir artículos activos de la otra persona.';
  end if;

  update public.trade_counteroffers
  set status = 'cancelled'
  where trade_request_id = p_trade_request_id
    and status = 'pending';

  insert into public.trade_counteroffers (
    trade_request_id,
    created_by,
    message,
    status
  )
  values (
    p_trade_request_id,
    v_actor_id,
    nullif(trim(coalesce(p_message, '')), ''),
    'pending'
  )
  returning id into v_counteroffer_id;

  insert into public.trade_counteroffer_items (counteroffer_id, item_id, role)
  values (v_counteroffer_id, v_request.requested_item_id, 'requested');

  insert into public.trade_counteroffer_items (counteroffer_id, item_id, role)
  select v_counteroffer_id, item_id, 'offered'
  from unnest(p_requested_offered_item_ids) as selected(item_id);

  update public.trade_requests
  set status = 'countered'
  where id = p_trade_request_id;

  return v_counteroffer_id;
end;
$$;

create or replace function public.respond_trade_counteroffer(
  p_counteroffer_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_counteroffer public.trade_counteroffers%rowtype;
  v_request public.trade_requests%rowtype;
  v_offered_item_ids uuid[];
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para responder la contraoferta.';
  end if;

  if p_status not in ('accepted', 'rejected') then
    raise exception 'Respuesta de contraoferta inválida.';
  end if;

  select * into v_counteroffer
  from public.trade_counteroffers
  where id = p_counteroffer_id
  for update;

  if not found then
    raise exception 'Contraoferta no encontrada.';
  end if;

  select * into v_request
  from public.trade_requests
  where id = v_counteroffer.trade_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.';
  end if;

  if v_actor_id <> v_request.requester_id then
    raise exception 'Solo quien envió la solicitud puede responder esta contraoferta.';
  end if;

  if v_counteroffer.created_by = v_actor_id then
    raise exception 'No puedes responder tu propia contraoferta.';
  end if;

  if v_counteroffer.status <> 'pending' or v_request.status <> 'countered' then
    raise exception 'Esta contraoferta ya no está pendiente.';
  end if;

  if public.has_user_block_between(v_request.requester_id, v_request.receiver_id) then
    raise exception 'No puedes interactuar con este usuario.';
  end if;

  if p_status = 'rejected' then
    update public.trade_counteroffers
    set status = 'rejected'
    where id = p_counteroffer_id;

    update public.trade_requests
    set status = 'rejected',
        rejection_reason = 'Contraoferta rechazada.'
    where id = v_request.id;

    return;
  end if;

  select array_agg(item_id) into v_offered_item_ids
  from public.trade_counteroffer_items
  where counteroffer_id = p_counteroffer_id
    and role = 'offered';

  if v_offered_item_ids is null or array_length(v_offered_item_ids, 1) is null then
    raise exception 'La contraoferta no tiene artículos.';
  end if;

  perform 1
  from public.items i
  where i.id = v_request.requested_item_id
    and i.owner_id = v_request.receiver_id
    and i.status = 'active'
    and i.moderation_status = 'active'
  for update;

  if not found then
    raise exception 'El artículo solicitado ya no está disponible.';
  end if;

  if (
    select count(*)
    from public.items i
    where i.id = any(v_offered_item_ids)
      and i.owner_id = v_request.requester_id
      and i.status = 'active'
      and i.moderation_status = 'active'
  ) <> array_length(v_offered_item_ids, 1) then
    raise exception 'Algún artículo de la contraoferta ya no está disponible.';
  end if;

  delete from public.trade_request_offered_items
  where trade_request_id = v_request.id;

  insert into public.trade_request_offered_items (trade_request_id, item_id)
  select v_request.id, item_id
  from unnest(v_offered_item_ids) as selected(item_id);

  update public.trade_counteroffers
  set status = 'accepted'
  where id = p_counteroffer_id;

  update public.trade_counteroffers
  set status = 'cancelled'
  where trade_request_id = v_request.id
    and id <> p_counteroffer_id
    and status = 'pending';

  update public.trade_requests
  set status = 'accepted',
      rejection_reason = null
  where id = v_request.id;
end;
$$;

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

  if new.status = 'countered' then
    perform public.insert_notification(
      new.requester_id,
      new.receiver_id,
      'message_received',
      'Contraoferta recibida',
      'La otra persona propuso una contraoferta. Revísala para aceptar o rechazar.',
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
