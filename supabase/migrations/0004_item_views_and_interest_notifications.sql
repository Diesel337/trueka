-- Trueka item views and interest-match notifications.
-- These events support discovery and publication feedback only.
-- There are no payment, money, shipping, delivery, or escrow fields.

create table if not exists public.item_views (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists item_views_item_idx
on public.item_views (item_id, created_at desc);

create index if not exists item_views_viewer_idx
on public.item_views (viewer_id, created_at desc);

alter table public.item_views enable row level security;

drop policy if exists "item owners see own item views" on public.item_views;
create policy "item owners see own item views" on public.item_views
for select using (
  viewer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.owner_id = auth.uid()
  )
);

drop policy if exists "authenticated users insert own item views" on public.item_views;
create policy "authenticated users insert own item views" on public.item_views
for insert with check (
  viewer_id = auth.uid()
  and exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.owner_id <> auth.uid()
      and i.status = 'active'
      and i.moderation_status = 'active'
      and not public.has_user_block_between(auth.uid(), i.owner_id)
  )
);

create or replace function public.item_interest_slugs_for_category(p_category_slug text)
returns text[]
language sql
immutable
as $$
  select case p_category_slug
    when 'computadoras-laptops' then array['laptops']
    when 'videojuegos-consolas' then array['consolas']
    when 'muebles-pequenos' then array['muebles']
    when 'ropa-sneakers' then array['sneakers', 'ropa-de-marca']
    when 'instrumentos-musicales' then array['instrumentos']
    when 'fotografia' then array['fotografia']
    else array[p_category_slug]
  end;
$$;

create or replace function public.notify_item_interest_matches(p_item_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  v_category_slug text;
  v_category_name text;
  v_interest_slugs text[];
  v_notification_count integer := 0;
  v_match record;
begin
  select * into v_item
  from public.items
  where id = p_item_id;

  if not found or v_item.status <> 'active' or v_item.moderation_status <> 'active' then
    return 0;
  end if;

  select c.slug, c.name
  into v_category_slug, v_category_name
  from public.categories c
  where c.id = v_item.category_id;

  v_interest_slugs := public.item_interest_slugs_for_category(v_category_slug);

  for v_match in
    select distinct interested_item.owner_id as recipient_id
    from public.item_private_interest_tags interest
    join public.tags t on t.id = interest.tag_id
    join public.items interested_item on interested_item.id = interest.item_id
    where t.slug = any(v_interest_slugs)
      and interested_item.owner_id <> v_item.owner_id
      and interested_item.status = 'active'
      and interested_item.moderation_status = 'active'
      and not public.has_user_block_between(interested_item.owner_id, v_item.owner_id)
      and not exists (
        select 1
        from public.notifications n
        where n.recipient_id = interested_item.owner_id
          and n.item_id = v_item.id
          and n.type = 'item_interest_match'
      )
  loop
    perform public.insert_notification(
      v_match.recipient_id,
      v_item.owner_id,
      'item_interest_match',
      'Artículo de tu interés',
      'Se publicó "' || v_item.title || '" en ' || coalesce(v_category_name, 'una categoría que te interesa') || '.',
      '/items/' || v_item.id::text,
      null,
      v_item.id
    );
    v_notification_count := v_notification_count + 1;
  end loop;

  return v_notification_count;
end;
$$;

create or replace function public.record_item_view(p_item_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_item public.items%rowtype;
  v_view_count integer;
begin
  select * into v_item
  from public.items
  where id = p_item_id;

  if not found then
    return 0;
  end if;

  select count(*)::integer into v_view_count
  from public.item_views
  where item_id = p_item_id;

  if v_viewer_id is null
     or v_viewer_id = v_item.owner_id
     or v_item.status <> 'active'
     or v_item.moderation_status <> 'active'
     or public.has_user_block_between(v_viewer_id, v_item.owner_id) then
    return v_view_count;
  end if;

  if exists (
    select 1
    from public.item_views
    where item_id = p_item_id
      and viewer_id = v_viewer_id
      and created_at > now() - interval '1 hour'
  ) then
    return v_view_count;
  end if;

  insert into public.item_views (item_id, viewer_id)
  values (p_item_id, v_viewer_id);

  select count(*)::integer into v_view_count
  from public.item_views
  where item_id = p_item_id;

  if v_view_count in (5, 10, 25, 50, 100)
     or (v_view_count > 100 and v_view_count % 100 = 0) then
    perform public.insert_notification(
      v_item.owner_id,
      null,
      'item_view_summary',
      'Tu publicación recibió vistas',
      '"' || v_item.title || '" llegó a ' || v_view_count::text || ' vistas.',
      '/items/' || p_item_id::text,
      null,
      p_item_id
    );
  end if;

  return v_view_count;
end;
$$;
