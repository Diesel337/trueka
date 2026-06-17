-- Track admin moderation actions and enable reversible item/user moderation.
-- Product boundary: this records safety decisions only.
-- It does not add payments, money fields, shipping, delivery, mediation, or escrow.

create table if not exists public.admin_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null check (
    action in (
      'hide_item',
      'restore_item',
      'ban_user',
      'unban_user',
      'review_report',
      'resolve_report',
      'dismiss_report',
      'update_report_notes'
    )
  ),
  report_id uuid references public.reports(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_item_id uuid references public.items(id) on delete set null,
  previous_item_status text,
  next_item_status text,
  previous_item_moderation_status text,
  next_item_moderation_status text,
  previous_user_banned boolean,
  next_user_banned boolean,
  note text check (note is null or char_length(trim(note)) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists admin_moderation_actions_created_at_idx
on public.admin_moderation_actions (created_at desc);

create index if not exists admin_moderation_actions_report_idx
on public.admin_moderation_actions (report_id, created_at desc);

create index if not exists admin_moderation_actions_target_item_idx
on public.admin_moderation_actions (target_item_id, created_at desc);

create index if not exists admin_moderation_actions_target_user_idx
on public.admin_moderation_actions (target_user_id, created_at desc);

alter table public.admin_moderation_actions enable row level security;

drop policy if exists "admins read moderation actions" on public.admin_moderation_actions;
create policy "admins read moderation actions" on public.admin_moderation_actions
for select using (public.is_admin());

drop policy if exists "admins insert moderation actions" on public.admin_moderation_actions;
create policy "admins insert moderation actions" on public.admin_moderation_actions
for insert with check (public.is_admin());
