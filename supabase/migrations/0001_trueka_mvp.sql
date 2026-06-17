-- Trueka MVP schema.
-- The product rule is intentional: trade requests exchange items for items only.
-- There are no payment, cash adjustment, shipping, delivery, or escrow columns.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  city text not null default 'Guadalajara',
  state text not null default 'Jalisco',
  country text not null default 'México',
  bio text,
  phone_verified boolean not null default false,
  email_verified boolean not null default false,
  identity_verification_level integer not null default 0 check (identity_verification_level between 0 and 3),
  rating_avg numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  completed_trades_count integer not null default 0 check (completed_trades_count >= 0),
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  is_prohibited boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) >= 20),
  known_defects text not null check (char_length(trim(known_defects)) >= 3),
  category_id uuid not null references public.categories(id),
  condition text not null check (
    condition in (
      'new',
      'like_new',
      'used_good',
      'used_with_details',
      'works_with_issues',
      'for_repair',
      'not_working_parts'
    )
  ),
  city text not null,
  state text not null,
  country text not null default 'México',
  approximate_zone text,
  approximate_value_range text check (
    approximate_value_range is null or approximate_value_range in (
      'under_500',
      '500_1500',
      '1500_3000',
      '3000_7000',
      '7000_15000',
      'over_15000',
      'prefer_not_to_say'
    )
  ),
  accepts_multiple_items boolean not null default true,
  accepts_other_cities boolean not null default false,
  public_preferences text,
  status text not null default 'active' check (
    status in ('draft', 'active', 'paused', 'reserved', 'traded', 'deleted', 'hidden_by_admin')
  ),
  moderation_status text not null default 'active' check (
    moderation_status in ('pending', 'active', 'flagged', 'hidden_by_admin', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  public_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.item_private_interest_tags (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, tag_id)
);

create table public.item_public_tags (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, tag_id)
);

create table public.trade_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  requested_item_id uuid not null references public.items(id),
  message text,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'rejected', 'countered', 'cancelled', 'expired', 'completed', 'reported')
  ),
  rejection_reason text,
  requester_city_snapshot text not null,
  requester_state_snapshot text not null,
  receiver_city_snapshot text not null,
  receiver_state_snapshot text not null,
  is_cross_city boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> receiver_id)
);

create table public.trade_request_offered_items (
  id uuid primary key default gen_random_uuid(),
  trade_request_id uuid not null references public.trade_requests(id) on delete cascade,
  item_id uuid not null references public.items(id),
  created_at timestamptz not null default now(),
  unique (trade_request_id, item_id)
);

create table public.trade_counteroffers (
  id uuid primary key default gen_random_uuid(),
  trade_request_id uuid not null references public.trade_requests(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.trade_counteroffer_items (
  id uuid primary key default gen_random_uuid(),
  counteroffer_id uuid not null references public.trade_counteroffers(id) on delete cascade,
  item_id uuid not null references public.items(id),
  role text not null check (role in ('requested', 'offered')),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trade_request_id uuid not null references public.trade_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  trade_request_id uuid not null references public.trade_requests(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  item_matched_description boolean,
  user_was_reliable boolean,
  created_at timestamptz not null default now(),
  unique (trade_request_id, reviewer_id),
  check (reviewer_id <> reviewed_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reported_item_id uuid references public.items(id) on delete set null,
  trade_request_id uuid references public.trade_requests(id) on delete set null,
  reason text not null check (
    reason in (
      'prohibited_item',
      'false_information',
      'suspicious_user',
      'possible_scam',
      'harassment',
      'stolen_item',
      'misleading_photos',
      'other'
    )
  ),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    reported_user_id is not null
    or reported_item_id is not null
    or trade_request_id is not null
  )
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index items_active_idx on public.items (status, moderation_status, city, category_id, created_at desc);
create index trade_requests_requester_idx on public.trade_requests (requester_id, status, created_at desc);
create index trade_requests_receiver_idx on public.trade_requests (receiver_id, status, created_at desc);
create index trade_request_offered_items_item_idx on public.trade_request_offered_items (item_id);
create index messages_trade_request_idx on public.messages (trade_request_id, created_at);
create index reports_status_idx on public.reports (status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger items_touch_updated_at
before update on public.items
for each row execute function public.touch_updated_at();

create trigger trade_requests_touch_updated_at
before update on public.trade_requests
for each row execute function public.touch_updated_at();

create trigger reports_touch_updated_at
before update on public.reports
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email_confirmed_at is not null, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.has_user_block_between(first_user uuid, second_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.blocks b
    where (b.blocker_id = first_user and b.blocked_id = second_user)
       or (b.blocker_id = second_user and b.blocked_id = first_user)
  );
$$;

create or replace function public.create_trade_request(
  p_requested_item_id uuid,
  p_offered_item_ids uuid[],
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_id uuid := auth.uid();
  v_requester public.profiles%rowtype;
  v_requested_item public.items%rowtype;
  v_receiver public.profiles%rowtype;
  v_request_id uuid;
  v_distinct_offered_count integer;
begin
  if v_requester_id is null then
    raise exception 'Debes iniciar sesión para proponer un trueque.';
  end if;

  select * into v_requester
  from public.profiles
  where id = v_requester_id
  for update;

  if not found or v_requester.is_banned then
    raise exception 'Tu cuenta no puede crear solicitudes en este momento.';
  end if;

  if p_offered_item_ids is null or array_length(p_offered_item_ids, 1) is null then
    raise exception 'Para proponer un trueque primero elige al menos un artículo propio.';
  end if;

  select count(distinct offered_id) into v_distinct_offered_count
  from unnest(p_offered_item_ids) offered_id;

  if v_distinct_offered_count <> array_length(p_offered_item_ids, 1) then
    raise exception 'No repitas artículos en la misma solicitud.';
  end if;

  select * into v_requested_item
  from public.items
  where id = p_requested_item_id
  for update;

  if not found or v_requested_item.status <> 'active' or v_requested_item.moderation_status <> 'active' then
    raise exception 'Este artículo ya no está disponible para trueque.';
  end if;

  if v_requested_item.owner_id = v_requester_id then
    raise exception 'No puedes proponer trueque por un artículo propio.';
  end if;

  select * into v_receiver
  from public.profiles
  where id = v_requested_item.owner_id
  for update;

  if not found or v_receiver.is_banned then
    raise exception 'Este usuario no puede recibir solicitudes en este momento.';
  end if;

  if public.has_user_block_between(v_requester_id, v_receiver.id) then
    raise exception 'No puedes interactuar con este usuario.';
  end if;

  if exists (
    select 1
    from unnest(p_offered_item_ids) offered_id
    left join public.items i on i.id = offered_id
    where i.id is null
       or i.owner_id <> v_requester_id
       or i.status <> 'active'
       or i.moderation_status <> 'active'
  ) then
    raise exception 'Solo puedes ofrecer artículos activos que sean tuyos.';
  end if;

  insert into public.trade_requests (
    requester_id,
    receiver_id,
    requested_item_id,
    message,
    requester_city_snapshot,
    requester_state_snapshot,
    receiver_city_snapshot,
    receiver_state_snapshot,
    is_cross_city
  )
  values (
    v_requester_id,
    v_receiver.id,
    v_requested_item.id,
    nullif(trim(coalesce(p_message, '')), ''),
    v_requester.city,
    v_requester.state,
    v_receiver.city,
    v_receiver.state,
    case
      when lower(trim(v_requester.state)) = 'jalisco'
        and lower(trim(v_receiver.state)) = 'jalisco'
        and lower(trim(v_requester.city)) in (
          'guadalajara',
          'zapopan',
          'tlaquepaque',
          'san pedro tlaquepaque',
          'tonala',
          'tonalá',
          'tlajomulco',
          'tlajomulco de zuniga',
          'tlajomulco de zúñiga'
        )
        and lower(trim(v_receiver.city)) in (
          'guadalajara',
          'zapopan',
          'tlaquepaque',
          'san pedro tlaquepaque',
          'tonala',
          'tonalá',
          'tlajomulco',
          'tlajomulco de zuniga',
          'tlajomulco de zúñiga'
        )
        then false
      else lower(trim(v_requester.city)) <> lower(trim(v_receiver.city))
        or lower(trim(v_requester.state)) <> lower(trim(v_receiver.state))
    end
  )
  returning id into v_request_id;

  insert into public.trade_request_offered_items (trade_request_id, item_id)
  select v_request_id, offered_id
  from unnest(p_offered_item_ids) offered_id;

  return v_request_id;
end;
$$;

create or replace function public.complete_trade_request(p_trade_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.trade_requests%rowtype;
  v_involved_item_ids uuid[];
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para completar un trueque.';
  end if;

  select * into v_request
  from public.trade_requests
  where id = p_trade_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.';
  end if;

  if v_actor_id not in (v_request.requester_id, v_request.receiver_id) and not public.is_admin() then
    raise exception 'No puedes completar esta solicitud.';
  end if;

  if v_request.status <> 'accepted' then
    raise exception 'Solo puedes completar una solicitud aceptada.';
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
end;
$$;

create or replace function public.update_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.trade_requests%rowtype;
begin
  select * into v_request
  from public.trade_requests
  where id = new.trade_request_id;

  if not found or v_request.status <> 'completed' then
    raise exception 'Solo se puede calificar un trueque completado.';
  end if;

  if new.reviewer_id not in (v_request.requester_id, v_request.receiver_id)
     or new.reviewed_id not in (v_request.requester_id, v_request.receiver_id) then
    raise exception 'Solo participantes del trueque pueden calificar.';
  end if;

  update public.profiles p
  set
    rating_avg = stats.rating_avg,
    rating_count = stats.rating_count
  from (
    select reviewed_id, round(avg(rating)::numeric, 2) as rating_avg, count(*)::integer as rating_count
    from public.ratings
    where reviewed_id = new.reviewed_id
    group by reviewed_id
  ) stats
  where p.id = stats.reviewed_id;

  return new;
end;
$$;

create trigger ratings_update_profile
after insert or update on public.ratings
for each row execute function public.update_profile_rating();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.item_private_interest_tags enable row level security;
alter table public.item_public_tags enable row level security;
alter table public.trade_requests enable row level security;
alter table public.trade_request_offered_items enable row level security;
alter table public.trade_counteroffers enable row level security;
alter table public.trade_counteroffer_items enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy "profiles are readable" on public.profiles
for select using (not is_banned or id = auth.uid() or public.is_admin());

create policy "profiles update own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid() and not is_admin);

create policy "admins manage profiles" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());

create policy "active categories are readable" on public.categories
for select using (is_active or public.is_admin());

create policy "admins manage categories" on public.categories
for all using (public.is_admin()) with check (public.is_admin());

create policy "active tags are readable" on public.tags
for select using (is_active or public.is_admin());

create policy "admins manage tags" on public.tags
for all using (public.is_admin()) with check (public.is_admin());

create policy "public active items are readable" on public.items
for select using (
  (status = 'active' and moderation_status = 'active')
  or owner_id = auth.uid()
  or public.is_admin()
);

create policy "owners insert active items" on public.items
for insert with check (
  owner_id = auth.uid()
  and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned)
  and not exists (select 1 from public.categories c where c.id = category_id and c.is_prohibited)
);

create policy "owners update own items" on public.items
for update using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "item photos visible with item" on public.item_photos
for select using (
  exists (
    select 1 from public.items i
    where i.id = item_id
      and ((i.status = 'active' and i.moderation_status = 'active') or i.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "owners manage item photos" on public.item_photos
for all using (
  exists (select 1 from public.items i where i.id = item_id and (i.owner_id = auth.uid() or public.is_admin()))
) with check (
  exists (select 1 from public.items i where i.id = item_id and (i.owner_id = auth.uid() or public.is_admin()))
);

create policy "private tags visible only to owner" on public.item_private_interest_tags
for select using (
  exists (select 1 from public.items i where i.id = item_id and (i.owner_id = auth.uid() or public.is_admin()))
);

create policy "owners manage private tags" on public.item_private_interest_tags
for all using (
  exists (select 1 from public.items i where i.id = item_id and (i.owner_id = auth.uid() or public.is_admin()))
) with check (
  exists (select 1 from public.items i where i.id = item_id and (i.owner_id = auth.uid() or public.is_admin()))
);

create policy "public item tags readable with item" on public.item_public_tags
for select using (
  exists (
    select 1 from public.items i
    where i.id = item_id
      and ((i.status = 'active' and i.moderation_status = 'active') or i.owner_id = auth.uid() or public.is_admin())
  )
);

create policy "owners manage public tags" on public.item_public_tags
for all using (
  exists (select 1 from public.items i where i.id = item_id and (i.owner_id = auth.uid() or public.is_admin()))
) with check (
  exists (select 1 from public.items i where i.id = item_id and (i.owner_id = auth.uid() or public.is_admin()))
);

create policy "trade requests visible to participants" on public.trade_requests
for select using (requester_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());

create policy "trade requests update by participants" on public.trade_requests
for update using (requester_id = auth.uid() or receiver_id = auth.uid() or public.is_admin())
with check (requester_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());

create policy "offered items visible to participants" on public.trade_request_offered_items
for select using (
  exists (
    select 1 from public.trade_requests tr
    where tr.id = trade_request_id
      and (tr.requester_id = auth.uid() or tr.receiver_id = auth.uid() or public.is_admin())
  )
);

create policy "counteroffers visible to participants" on public.trade_counteroffers
for select using (
  exists (
    select 1 from public.trade_requests tr
    where tr.id = trade_request_id
      and (tr.requester_id = auth.uid() or tr.receiver_id = auth.uid() or public.is_admin())
  )
);

create policy "participants create counteroffers" on public.trade_counteroffers
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.trade_requests tr
    where tr.id = trade_request_id
      and tr.status in ('pending', 'countered')
      and (tr.requester_id = auth.uid() or tr.receiver_id = auth.uid())
      and not public.has_user_block_between(tr.requester_id, tr.receiver_id)
  )
);

create policy "counteroffer items visible to participants" on public.trade_counteroffer_items
for select using (
  exists (
    select 1
    from public.trade_counteroffers co
    join public.trade_requests tr on tr.id = co.trade_request_id
    where co.id = counteroffer_id
      and (tr.requester_id = auth.uid() or tr.receiver_id = auth.uid() or public.is_admin())
  )
);

create policy "messages visible to participants" on public.messages
for select using (
  exists (
    select 1 from public.trade_requests tr
    where tr.id = trade_request_id
      and (tr.requester_id = auth.uid() or tr.receiver_id = auth.uid() or public.is_admin())
  )
);

create policy "participants send messages" on public.messages
for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.trade_requests tr
    where tr.id = trade_request_id
      and tr.status in ('pending', 'accepted', 'countered')
      and (tr.requester_id = auth.uid() or tr.receiver_id = auth.uid())
      and not public.has_user_block_between(tr.requester_id, tr.receiver_id)
  )
);

create policy "ratings readable" on public.ratings
for select using (true);

create policy "participants rate completed trades" on public.ratings
for insert with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.trade_requests tr
    where tr.id = trade_request_id
      and tr.status = 'completed'
      and reviewer_id in (tr.requester_id, tr.receiver_id)
      and reviewed_id in (tr.requester_id, tr.receiver_id)
      and reviewer_id <> reviewed_id
  )
);

create policy "users create reports" on public.reports
for insert with check (reporter_id = auth.uid());

create policy "users see own reports" on public.reports
for select using (reporter_id = auth.uid() or public.is_admin());

create policy "admins manage reports" on public.reports
for all using (public.is_admin()) with check (public.is_admin());

create policy "users see own blocks" on public.blocks
for select using (blocker_id = auth.uid() or public.is_admin());

create policy "users create own blocks" on public.blocks
for insert with check (blocker_id = auth.uid());

create policy "users delete own blocks" on public.blocks
for delete using (blocker_id = auth.uid() or public.is_admin());

insert into public.categories (name, slug) values
  ('Electrónicos', 'electronicos'),
  ('Celulares', 'celulares'),
  ('Computadoras y laptops', 'computadoras-laptops'),
  ('Videojuegos y consolas', 'videojuegos-consolas'),
  ('Herramientas', 'herramientas'),
  ('Bicicletas', 'bicicletas'),
  ('Audio', 'audio'),
  ('Instrumentos musicales', 'instrumentos-musicales'),
  ('Muebles pequeños', 'muebles-pequenos'),
  ('Ropa y sneakers', 'ropa-sneakers'),
  ('Libros', 'libros'),
  ('Juguetes', 'juguetes'),
  ('Coleccionables', 'coleccionables'),
  ('Fotografía', 'fotografia'),
  ('Deportes', 'deportes'),
  ('Hogar', 'hogar')
on conflict (slug) do nothing;

insert into public.categories (name, slug, is_active, is_prohibited) values
  ('Artículos prohibidos', 'articulos-prohibidos', false, true)
on conflict (slug) do nothing;

insert into public.tags (name, slug) values
  ('Celulares', 'celulares'),
  ('Laptops', 'laptops'),
  ('Consolas', 'consolas'),
  ('Herramientas', 'herramientas'),
  ('Bicicletas', 'bicicletas'),
  ('Audio', 'audio'),
  ('Muebles', 'muebles'),
  ('Sneakers', 'sneakers'),
  ('Ropa de marca', 'ropa-de-marca'),
  ('Instrumentos', 'instrumentos'),
  ('Coleccionables', 'coleccionables'),
  ('Fotografía', 'fotografia'),
  ('Camping', 'camping'),
  ('Juguetes', 'juguetes'),
  ('Libros', 'libros')
on conflict (slug) do nothing;
