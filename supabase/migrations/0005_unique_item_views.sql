-- Trueka unique item views.
-- One signed-in viewer counts once per item, even if they open the photos multiple times.
-- No payment, money, shipping, delivery, or escrow fields are introduced here.

create index if not exists item_views_item_viewer_idx
on public.item_views (item_id, viewer_id);

create or replace function public.record_item_view(p_item_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_item public.items%rowtype;
  v_unique_view_count integer;
begin
  select * into v_item
  from public.items
  where id = p_item_id;

  if not found then
    return 0;
  end if;

  select count(distinct viewer_id)::integer into v_unique_view_count
  from public.item_views
  where item_id = p_item_id;

  if v_viewer_id is null
     or v_viewer_id = v_item.owner_id
     or v_item.status <> 'active'
     or v_item.moderation_status <> 'active'
     or public.has_user_block_between(v_viewer_id, v_item.owner_id) then
    return v_unique_view_count;
  end if;

  if exists (
    select 1
    from public.item_views
    where item_id = p_item_id
      and viewer_id = v_viewer_id
  ) then
    return v_unique_view_count;
  end if;

  insert into public.item_views (item_id, viewer_id)
  values (p_item_id, v_viewer_id);

  select count(distinct viewer_id)::integer into v_unique_view_count
  from public.item_views
  where item_id = p_item_id;

  if v_unique_view_count in (5, 10, 25, 50, 100)
     or (v_unique_view_count > 100 and v_unique_view_count % 100 = 0) then
    perform public.insert_notification(
      v_item.owner_id,
      null,
      'item_view_summary',
      'Tu publicación recibió vistas únicas',
      '"' || v_item.title || '" llegó a ' || v_unique_view_count::text || ' vistas únicas.',
      '/items/' || p_item_id::text,
      null,
      p_item_id
    );
  end if;

  return v_unique_view_count;
end;
$$;
