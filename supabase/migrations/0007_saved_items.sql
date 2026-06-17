-- Trueka saved items.
-- Users can privately save active items from other people.
-- This does not introduce payments, money, shipping, delivery, or escrow.

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists saved_items_user_idx
on public.saved_items (user_id, created_at desc);

create index if not exists saved_items_item_idx
on public.saved_items (item_id, created_at desc);

alter table public.saved_items enable row level security;

drop policy if exists "users see own saved items" on public.saved_items;
create policy "users see own saved items" on public.saved_items
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users save active items from others" on public.saved_items;
create policy "users save active items from others" on public.saved_items
for insert with check (
  user_id = auth.uid()
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

drop policy if exists "users delete own saved items" on public.saved_items;
create policy "users delete own saved items" on public.saved_items
for delete using (user_id = auth.uid() or public.is_admin());
