-- Queue suspected prohibited items for admin review before they can go public.
-- Product boundary: this is a moderation workflow only.
-- It does not add payments, money fields, shipping, delivery, mediation, or escrow.

create table if not exists public.item_moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  opened_by uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (
    status in ('open', 'reviewing', 'approved', 'rejected', 'dismissed')
  ),
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  admin_notes text check (admin_notes is null or char_length(trim(admin_notes)) <= 1000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists item_moderation_reviews_status_idx
on public.item_moderation_reviews (status, created_at desc);

create index if not exists item_moderation_reviews_item_idx
on public.item_moderation_reviews (item_id, created_at desc);

drop trigger if exists item_moderation_reviews_touch_updated_at on public.item_moderation_reviews;
create trigger item_moderation_reviews_touch_updated_at
before update on public.item_moderation_reviews
for each row execute function public.touch_updated_at();

alter table public.item_moderation_reviews enable row level security;

drop policy if exists "owners read own item moderation reviews" on public.item_moderation_reviews;
create policy "owners read own item moderation reviews" on public.item_moderation_reviews
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.owner_id = auth.uid()
  )
);

drop policy if exists "owners create own item moderation reviews" on public.item_moderation_reviews;
create policy "owners create own item moderation reviews" on public.item_moderation_reviews
for insert with check (
  opened_by = auth.uid()
  and exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.owner_id = auth.uid()
  )
);

drop policy if exists "admins manage item moderation reviews" on public.item_moderation_reviews;
create policy "admins manage item moderation reviews" on public.item_moderation_reviews
for all using (public.is_admin()) with check (public.is_admin());

alter table public.admin_moderation_actions
drop constraint if exists admin_moderation_actions_action_check;

alter table public.admin_moderation_actions
add constraint admin_moderation_actions_action_check
check (
  action in (
    'hide_item',
    'restore_item',
    'approve_item',
    'reject_item',
    'ban_user',
    'unban_user',
    'review_report',
    'resolve_report',
    'dismiss_report',
    'update_report_notes'
  )
);
