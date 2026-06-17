-- Hide public item surfaces when either user has blocked the other.
-- Product boundary: this only strengthens visibility and interaction safety.
-- It does not add payments, money fields, shipping, delivery, mediation, or escrow.

drop policy if exists "public active items are readable" on public.items;
create policy "public active items are readable" on public.items
for select using (
  (
    status = 'active'
    and moderation_status = 'active'
    and not public.has_user_block_between(auth.uid(), owner_id)
  )
  or owner_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "item photos visible with item" on public.item_photos;
create policy "item photos visible with item" on public.item_photos
for select using (
  exists (
    select 1
    from public.items i
    where i.id = item_id
      and (
        (
          i.status = 'active'
          and i.moderation_status = 'active'
          and not public.has_user_block_between(auth.uid(), i.owner_id)
        )
        or i.owner_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "public item tags readable with item" on public.item_public_tags;
create policy "public item tags readable with item" on public.item_public_tags
for select using (
  exists (
    select 1
    from public.items i
    where i.id = item_id
      and (
        (
          i.status = 'active'
          and i.moderation_status = 'active'
          and not public.has_user_block_between(auth.uid(), i.owner_id)
        )
        or i.owner_id = auth.uid()
        or public.is_admin()
      )
  )
);
