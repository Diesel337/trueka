-- Add optional postal codes for approximate proximity sorting.
-- This does not add payments, money in requests, managed shipping, delivery, escrow, or address handling.

alter table public.profiles
add column if not exists postal_code text;

alter table public.items
add column if not exists postal_code text;

alter table public.profiles
drop constraint if exists profiles_postal_code_format;

alter table public.profiles
add constraint profiles_postal_code_format
check (postal_code is null or postal_code ~ '^[0-9]{5}$');

alter table public.items
drop constraint if exists items_postal_code_format;

alter table public.items
add constraint items_postal_code_format
check (postal_code is null or postal_code ~ '^[0-9]{5}$');

create index if not exists profiles_postal_code_idx
on public.profiles (postal_code);

create index if not exists items_postal_code_active_idx
on public.items (postal_code)
where status = 'active' and moderation_status = 'active';

comment on column public.profiles.postal_code is
  'Optional five-digit postal code used for approximate discovery sorting, not an address.';

comment on column public.items.postal_code is
  'Optional five-digit postal code used for approximate discovery sorting, not delivery or shipping.';
