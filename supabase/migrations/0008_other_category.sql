-- Add catch-all category for items that do not fit the initial catalog.
-- This keeps publication flexible without adding payment, money, shipping, delivery, or escrow fields.

insert into public.categories (name, slug)
values ('Otros', 'otros')
on conflict (slug) do nothing;
