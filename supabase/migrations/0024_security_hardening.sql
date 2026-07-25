-- Security hardening for profiles, items, trade requests, Storage and rate limits.
-- Product boundaries remain unchanged: item-for-item trades only, without payments,
-- money adjustments, managed shipping, managed delivery, mediation or escrow.

-- Keep block checks useful to RLS without exposing relationships between arbitrary users.
create or replace function public.has_user_block_between(first_user uuid, second_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if first_user is null or second_user is null then
    return false;
  end if;

  if auth.role() = 'authenticated'
    and auth.uid() not in (first_user, second_user)
    and not public.is_admin()
  then
    return false;
  end if;

  return exists (
    select 1
    from public.blocks b
    where (b.blocker_id = first_user and b.blocked_id = second_user)
       or (b.blocker_id = second_user and b.blocked_id = first_user)
  );
end;
$$;

-- A self-service profile update may change presentation fields, but it must preserve
-- reputation, moderation and trust fields unless Auth proves a verification change.
create or replace function public.profile_self_update_is_safe(
  p_profile_id uuid,
  p_phone_verified boolean,
  p_email_verified boolean,
  p_identity_verification_level integer,
  p_rating_avg numeric,
  p_rating_count integer,
  p_completed_trades_count integer,
  p_published_items_count integer,
  p_is_admin boolean,
  p_is_banned boolean,
  p_phone_last4 text,
  p_phone_verified_at timestamptz,
  p_phone_verification_started_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  v_current public.profiles%rowtype;
  v_auth_user auth.users%rowtype;
  v_auth_email_verified boolean;
  v_phone_candidate text;
  v_phone_last4 text;
  v_auth_phone_verified boolean;
begin
  if auth.uid() is null or p_profile_id <> auth.uid() then
    return false;
  end if;

  select * into v_current
  from public.profiles
  where id = auth.uid();

  select * into v_auth_user
  from auth.users
  where id = auth.uid();

  if not found then
    return false;
  end if;

  v_auth_email_verified := public.get_auth_email_verified(
    v_auth_user.email_confirmed_at,
    coalesce(v_auth_user.raw_user_meta_data, '{}'::jsonb)
  );
  v_phone_candidate := coalesce(nullif(v_auth_user.phone_change, ''), v_auth_user.phone, '');
  v_phone_last4 := nullif(right(regexp_replace(v_phone_candidate, '[^0-9]', '', 'g'), 4), '');
  v_auth_phone_verified := nullif(v_auth_user.phone_change, '') is null
    and v_auth_user.phone_confirmed_at is not null
    and v_phone_last4 is not null;

  return p_identity_verification_level = v_current.identity_verification_level
    and p_rating_avg = v_current.rating_avg
    and p_rating_count = v_current.rating_count
    and p_completed_trades_count = v_current.completed_trades_count
    and p_published_items_count = v_current.published_items_count
    and p_is_admin = v_current.is_admin
    and p_is_banned = v_current.is_banned
    and (
      p_email_verified = v_current.email_verified
      or (
        not v_current.email_verified
        and p_email_verified
        and v_auth_email_verified
      )
    )
    and (
      (
        p_phone_verified = v_current.phone_verified
        and p_phone_last4 is not distinct from v_current.phone_last4
        and p_phone_verified_at is not distinct from v_current.phone_verified_at
        and p_phone_verification_started_at is not distinct from v_current.phone_verification_started_at
      )
      or (
        p_phone_last4 is not distinct from v_phone_last4
        and p_phone_verified = v_auth_phone_verified
        and (
          (p_phone_verified and p_phone_verified_at is not null)
          or (
            not p_phone_verified
            and p_phone_verified_at is null
            and p_phone_verification_started_at is not null
          )
        )
      )
    );
end;
$$;

drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles update own safe fields" on public.profiles;
create policy "profiles update own safe fields" on public.profiles
for update
using (
  id = auth.uid()
  and not is_banned
)
with check (
  id = auth.uid()
  and public.profile_self_update_is_safe(
    id,
    phone_verified,
    email_verified,
    identity_verification_level,
    rating_avg,
    rating_count,
    completed_trades_count,
    published_items_count,
    is_admin,
    is_banned,
    phone_last4,
    phone_verified_at,
    phone_verification_started_at
  )
);

-- Match the application moderation vocabulary at the database boundary.
create or replace function public.item_text_requires_moderation(
  p_title text,
  p_description text,
  p_known_defects text
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_text text;
begin
  v_text := lower(translate(
    concat_ws(' ', p_title, p_description, p_known_defects),
    'áéíóúüñÁÉÍÓÚÜÑ',
    'aeiouunAEIOUUN'
  ));

  return v_text ~ '\m(arma|armas|pistola|pistolas|rifle|rifles|municion|municiones|bala|balas)\M'
    or v_text ~ '\m(explosivo|explosivos|pirotecnia)\M'
    or v_text ~ '\mfuego artificial(es)?\M'
    or v_text ~ '\m(droga|drogas|narcotico|narcoticos)\M'
    or v_text ~ '\mmedicamento(s)? controlado(s)?\M'
    or v_text ~ '\mreceta medica\M'
    or v_text ~ '\m(alcohol|tabaco|vape|vapes|vaper|vapers|nicotina)\M'
    or v_text ~ '\m(mascota|mascotas|perro|perros|gato|gatos|animal|animales)\M'
    or v_text ~ '\m(ine|pasaporte|pasaportes|licencia|licencias|acta|actas)\M'
    or v_text ~ '\mdocumento(s)? oficial(es)?\M'
    or v_text ~ '\m(robado|robados|robada|robadas)\M'
    or v_text ~ '\msin (papeles|factura)\M'
    or v_text ~ '\m(replica|replicas|falso|falsos|falsa|falsas|falsificado|falsificados|clon|clones)\M'
    or v_text ~ '\mdato(s)? personal(es)?\M'
    or v_text ~ '\mbase de datos\M'
    or v_text ~ '\mcuenta(s)? de tercero(s)?\M';
end;
$$;

create or replace function public.item_owner_update_is_safe(
  p_item_id uuid,
  p_owner_id uuid,
  p_title text,
  p_description text,
  p_known_defects text,
  p_category_id uuid,
  p_status text,
  p_moderation_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_current public.items%rowtype;
  v_status_transition_allowed boolean;
  v_moderation_transition_allowed boolean;
  v_requires_moderation boolean;
begin
  if auth.uid() is null or p_owner_id <> auth.uid() then
    return false;
  end if;

  select * into v_current
  from public.items
  where id = p_item_id;

  if not found
    or v_current.owner_id <> auth.uid()
    or v_current.status in ('reserved', 'traded', 'deleted', 'hidden_by_admin')
    or v_current.moderation_status in ('flagged', 'hidden_by_admin', 'rejected')
  then
    return false;
  end if;

  if not exists (
    select 1
    from public.categories c
    where c.id = p_category_id
      and c.is_active
      and not c.is_prohibited
  ) then
    return false;
  end if;

  v_requires_moderation := public.item_text_requires_moderation(
    p_title,
    p_description,
    p_known_defects
  );
  v_status_transition_allowed := p_status = v_current.status
    or (v_current.status = 'draft' and p_status in ('active', 'deleted'))
    or (v_current.status = 'active' and p_status in ('paused', 'draft', 'deleted'))
    or (v_current.status = 'paused' and p_status in ('active', 'draft', 'deleted'));
  v_moderation_transition_allowed := p_moderation_status = v_current.moderation_status
    or (
      p_moderation_status = 'pending'
      and p_status = 'draft'
      and v_current.moderation_status = 'active'
    );

  if not v_status_transition_allowed or not v_moderation_transition_allowed then
    return false;
  end if;

  if v_requires_moderation
    and (p_status <> 'draft' or p_moderation_status <> 'pending')
  then
    return false;
  end if;

  if p_status = 'active' then
    return p_moderation_status = 'active'
      and not v_requires_moderation
      and exists (
        select 1
        from public.item_photos photo
        where photo.item_id = p_item_id
      );
  end if;

  return true;
end;
$$;

create or replace function public.protect_immutable_item_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'No se puede cambiar el propietario de una publicacion.';
  end if;

  if old.status = 'traded' and new.status <> 'traded' then
    raise exception 'Un articulo intercambiado no se puede reactivar.';
  end if;

  return new;
end;
$$;

drop trigger if exists items_protect_immutable_state on public.items;
create trigger items_protect_immutable_state
before update on public.items
for each row execute function public.protect_immutable_item_state();

drop policy if exists "owners insert active items" on public.items;
drop policy if exists "owners insert safe drafts" on public.items;
create policy "owners insert safe drafts" on public.items
for insert
with check (
  owner_id = auth.uid()
  and status = 'draft'
  and moderation_status in ('active', 'pending')
  and (
    not public.item_text_requires_moderation(title, description, known_defects)
    or moderation_status = 'pending'
  )
  and not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_banned
  )
  and exists (
    select 1
    from public.categories c
    where c.id = category_id
      and c.is_active
      and not c.is_prohibited
  )
);

drop policy if exists "owners update own items" on public.items;
drop policy if exists "owners update own items safely" on public.items;
create policy "owners update own items safely" on public.items
for update
using (
  owner_id = auth.uid()
  and not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_banned
  )
)
with check (
  public.item_owner_update_is_safe(
    id,
    owner_id,
    title,
    description,
    known_defects,
    category_id,
    status,
    moderation_status
  )
);

drop policy if exists "admins update items" on public.items;
create policy "admins update items" on public.items
for update
using (public.is_admin())
with check (public.is_admin());

-- Participant updates keep identities immutable and follow the same role/state
-- transitions enforced by the application.
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
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_current
  from public.trade_requests
  where id = p_trade_request_id;

  if not found
    or auth.uid() not in (v_current.requester_id, v_current.receiver_id)
    or public.has_user_block_between(v_current.requester_id, v_current.receiver_id)
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_banned
    )
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

  if p_status = 'cancelled' then
    return auth.uid() = v_current.requester_id
      and v_current.status in ('pending', 'countered')
      and p_rejection_reason is null;
  end if;

  if p_status in ('accepted', 'rejected') then
    if auth.uid() <> v_current.receiver_id
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

  if p_status = 'expired' then
    return p_rejection_reason is null;
  end if;

  return false;
end;
$$;

drop policy if exists "trade requests update by participants" on public.trade_requests;
drop policy if exists "trade requests update by participants safely" on public.trade_requests;
create policy "trade requests update by participants safely" on public.trade_requests
for update
using (
  requester_id = auth.uid()
  or receiver_id = auth.uid()
)
with check (
  public.trade_request_participant_update_is_safe(
    id,
    requester_id,
    receiver_id,
    requested_item_id,
    message,
    status,
    rejection_reason,
    requester_city_snapshot,
    requester_state_snapshot,
    receiver_city_snapshot,
    receiver_state_snapshot,
    is_cross_city
  )
);

drop policy if exists "admins update trade requests" on public.trade_requests;
create policy "admins update trade requests" on public.trade_requests
for update
using (public.is_admin())
with check (public.is_admin());

-- Counteroffers must use create_trade_counteroffer(), which validates all item ownership.
drop policy if exists "participants create counteroffers" on public.trade_counteroffers;

-- Serialize rate-limit consumption by user, action and target.
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
  v_action text := lower(trim(coalesce(p_action, '')));
  v_target_key text := nullif(trim(coalesce(p_target_key, '')), '');
  v_event_count integer;
  v_lock_key bigint;
begin
  if v_user_id is null
    or v_action = ''
    or p_window_seconds < 1
    or p_window_seconds > 604800
    or p_max_events < 1
    or p_max_events > 1000
  then
    return false;
  end if;

  v_lock_key := hashtextextended(
    v_user_id::text || ':' || v_action || ':' || coalesce(v_target_key, ''),
    0
  );
  perform pg_advisory_xact_lock(v_lock_key);

  delete from public.rate_limit_events
  where created_at < now() - interval '14 days';

  select count(*)
  into v_event_count
  from public.rate_limit_events
  where user_id = v_user_id
    and action = v_action
    and created_at >= now() - make_interval(secs => p_window_seconds)
    and target_key is not distinct from v_target_key;

  if v_event_count >= p_max_events then
    return false;
  end if;

  insert into public.rate_limit_events (user_id, action, target_key)
  values (v_user_id, v_action, v_target_key);

  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer, text) from public;
revoke all on function public.consume_rate_limit(text, integer, integer, text) from anon;
revoke all on function public.consume_rate_limit(text, integer, integer, text) from authenticated;

create or replace function public.enforce_trade_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.consume_rate_limit('trade_request_create', 3600, 12, null) then
    raise exception 'Has enviado varias solicitudes en poco tiempo. Intenta de nuevo mas tarde.';
  end if;

  if not public.consume_rate_limit(
    'trade_request_create_for_item',
    3600,
    3,
    new.requested_item_id::text
  ) then
    raise exception 'Ya enviaste varias solicitudes para esta publicacion. Intenta mas tarde.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.consume_rate_limit('message_send', 60, 30, null) then
    raise exception 'Estas enviando mensajes muy rapido. Espera un momento.';
  end if;

  if not public.consume_rate_limit(
    'message_send_in_thread',
    60,
    20,
    new.trade_request_id::text
  ) then
    raise exception 'Estas enviando demasiados mensajes en esta solicitud. Espera un momento.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_key text;
begin
  v_target_key := concat_ws(
    '|',
    case when new.reported_user_id is not null then 'user:' || new.reported_user_id::text end,
    case when new.reported_item_id is not null then 'item:' || new.reported_item_id::text end,
    case when new.trade_request_id is not null then 'trade:' || new.trade_request_id::text end
  );

  if not public.consume_rate_limit('report_create', 3600, 10, null) then
    raise exception 'Ya recibimos varios reportes tuyos recientemente. Intenta mas tarde.';
  end if;

  if not public.consume_rate_limit('report_create_for_target', 86400, 2, v_target_key) then
    raise exception 'Ya recibimos reportes tuyos sobre este caso. Gracias por avisar.';
  end if;

  return new;
end;
$$;

drop trigger if exists trade_requests_enforce_rate_limit on public.trade_requests;
create trigger trade_requests_enforce_rate_limit
before insert on public.trade_requests
for each row execute function public.enforce_trade_request_rate_limit();

drop trigger if exists messages_enforce_rate_limit on public.messages;
create trigger messages_enforce_rate_limit
before insert on public.messages
for each row execute function public.enforce_message_rate_limit();

drop trigger if exists reports_enforce_rate_limit on public.reports;
create trigger reports_enforce_rate_limit
before insert on public.reports
for each row execute function public.enforce_report_rate_limit();

drop policy if exists "participants send messages" on public.messages;
drop policy if exists "participants send rate limited messages" on public.messages;
create policy "participants send rate limited messages" on public.messages
for insert
with check (
  sender_id = auth.uid()
  and not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_banned
  )
  and exists (
    select 1
    from public.trade_requests tr
    where tr.id = trade_request_id
      and tr.status in ('pending', 'accepted', 'countered')
      and auth.uid() in (tr.requester_id, tr.receiver_id)
      and not public.has_user_block_between(tr.requester_id, tr.receiver_id)
  )
);

drop policy if exists "users create reports" on public.reports;
drop policy if exists "users create rate limited reports" on public.reports;
create policy "users create rate limited reports" on public.reports
for insert
with check (
  reporter_id = auth.uid()
  and status = 'open'
  and admin_notes is null
  and not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_banned
  )
);

-- Enforce bucket limits and bind every upload path to the authenticated owner.
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]::text[]
where id = 'item-photos';

update storage.buckets
set
  file_size_limit = 3145728,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]::text[]
where id = 'profile-avatars';

drop policy if exists "authenticated users upload item photos" on storage.objects;
drop policy if exists "owners update item photos" on storage.objects;
drop policy if exists "owners delete item photos" on storage.objects;
drop policy if exists "owners upload item photos to item paths" on storage.objects;
drop policy if exists "owners update item photos in item paths" on storage.objects;
drop policy if exists "owners delete item photos in item paths" on storage.objects;

create policy "owners upload item photos to item paths"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.items item
    where item.owner_id = auth.uid()
      and item.id::text = (storage.foldername(name))[2]
      and item.status in ('draft', 'active', 'paused')
  )
);

create policy "owners update item photos in item paths"
on storage.objects for update
to authenticated
using (
  bucket_id = 'item-photos'
  and owner = auth.uid()
)
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.items item
    where item.owner_id = auth.uid()
      and item.id::text = (storage.foldername(name))[2]
      and item.status in ('draft', 'active', 'paused')
  )
);

create policy "owners delete item photos in item paths"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'item-photos'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated users upload profile avatars" on storage.objects;
drop policy if exists "owners update profile avatars" on storage.objects;
drop policy if exists "owners delete profile avatars" on storage.objects;
drop policy if exists "owners upload profile avatars to own path" on storage.objects;
drop policy if exists "owners update profile avatars in own path" on storage.objects;
drop policy if exists "owners delete profile avatars in own path" on storage.objects;

create policy "owners upload profile avatars to own path"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners update profile avatars in own path"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and owner = auth.uid()
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners delete profile avatars in own path"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

revoke all on function public.profile_self_update_is_safe(
  uuid,
  boolean,
  boolean,
  integer,
  numeric,
  integer,
  integer,
  integer,
  boolean,
  boolean,
  text,
  timestamptz,
  timestamptz
) from public;
grant execute on function public.profile_self_update_is_safe(
  uuid,
  boolean,
  boolean,
  integer,
  numeric,
  integer,
  integer,
  integer,
  boolean,
  boolean,
  text,
  timestamptz,
  timestamptz
) to authenticated;

revoke all on function public.item_owner_update_is_safe(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text
) from public;
grant execute on function public.item_owner_update_is_safe(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text
) to authenticated;

revoke all on function public.trade_request_participant_update_is_safe(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) from public;
grant execute on function public.trade_request_participant_update_is_safe(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) to authenticated;

revoke all on function public.enforce_trade_request_rate_limit() from public;
revoke all on function public.enforce_message_rate_limit() from public;
revoke all on function public.enforce_report_rate_limit() from public;
revoke all on function public.protect_immutable_item_state() from public;
