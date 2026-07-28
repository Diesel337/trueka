-- Keep accepted and completed trade details readable to both participants.
-- Public browsing remains limited to active items, and hidden matching tags
-- remain visible only to the item owner.

create or replace function public.can_view_trade_item(p_item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.trade_requests request
      where request.status in ('accepted', 'completed')
        and auth.uid() in (request.requester_id, request.receiver_id)
        and (
          request.requested_item_id = p_item_id
          or exists (
            select 1
            from public.trade_request_offered_items offered
            where offered.trade_request_id = request.id
              and offered.item_id = p_item_id
          )
        )
    );
$$;

revoke all on function public.can_view_trade_item(uuid) from public;
grant execute on function public.can_view_trade_item(uuid) to anon, authenticated;

drop policy if exists "public active items are readable" on public.items;
create policy "public active items are readable" on public.items
for select using (
  (
    status = 'active'
    and moderation_status = 'active'
    and not public.has_user_block_between(auth.uid(), owner_id)
  )
  or owner_id = auth.uid()
  or (
    status in ('reserved', 'traded')
    and moderation_status = 'active'
    and public.can_view_trade_item(id)
  )
  or public.is_admin()
);

drop policy if exists "item photos visible with item" on public.item_photos;
create policy "item photos visible with item" on public.item_photos
for select using (
  exists (
    select 1
    from public.items item
    where item.id = item_id
      and (
        (
          item.status = 'active'
          and item.moderation_status = 'active'
          and not public.has_user_block_between(auth.uid(), item.owner_id)
        )
        or item.owner_id = auth.uid()
        or (
          item.status in ('reserved', 'traded')
          and item.moderation_status = 'active'
          and public.can_view_trade_item(item.id)
        )
        or public.is_admin()
      )
  )
);

drop policy if exists "public item tags readable with item" on public.item_public_tags;
create policy "public item tags readable with item" on public.item_public_tags
for select using (
  exists (
    select 1
    from public.items item
    where item.id = item_id
      and (
        (
          item.status = 'active'
          and item.moderation_status = 'active'
          and not public.has_user_block_between(auth.uid(), item.owner_id)
        )
        or item.owner_id = auth.uid()
        or (
          item.status in ('reserved', 'traded')
          and item.moderation_status = 'active'
          and public.can_view_trade_item(item.id)
        )
        or public.is_admin()
      )
  )
);

drop policy if exists "item photos readable with visible item" on storage.objects;
create policy "item photos readable with visible item"
on storage.objects for select
using (
  bucket_id = 'item-photos'
  and exists (
    select 1
    from public.items item
    where item.id::text = (storage.foldername(name))[2]
      and (
        (
          item.status = 'active'
          and item.moderation_status = 'active'
          and not public.has_user_block_between(auth.uid(), item.owner_id)
        )
        or item.owner_id = auth.uid()
        or (
          item.status in ('reserved', 'traded')
          and item.moderation_status = 'active'
          and public.can_view_trade_item(item.id)
        )
        or public.is_admin()
      )
  )
);
