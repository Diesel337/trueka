-- Keep private profile metadata available to its owner without exposing it through
-- public profile queries. No payment, money, shipping or delivery data is added.

create or replace function public.get_my_profile()
returns setof public.profiles
language sql
security definer
set search_path = public
stable
rows 1
as $$
  select profile.*
  from public.profiles profile
  where profile.id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_profile() from public;
revoke all on function public.get_my_profile() from anon;
grant execute on function public.get_my_profile() to authenticated;

-- Supabase grants table-level select privileges by default. Replace that broad grant
-- with a public column allowlist. RLS still controls which profile rows are visible.
revoke select on table public.profiles from anon;
revoke select on table public.profiles from authenticated;

grant select (
  id,
  display_name,
  avatar_url,
  city,
  state,
  country,
  bio,
  phone_verified,
  email_verified,
  rating_avg,
  rating_count,
  completed_trades_count,
  published_items_count,
  is_admin,
  is_banned,
  created_at,
  updated_at
) on table public.profiles to anon;

grant select (
  id,
  display_name,
  avatar_url,
  city,
  state,
  country,
  bio,
  phone_verified,
  email_verified,
  rating_avg,
  rating_count,
  completed_trades_count,
  published_items_count,
  is_admin,
  is_banned,
  created_at,
  updated_at
) on table public.profiles to authenticated;

-- Item locations only need a broad area for nearby sorting. Mask the final two
-- digits so a public item never stores the owner's exact postal code.
update public.items
set postal_code = left(postal_code, 3) || '00'
where postal_code is not null;

alter table public.items
drop constraint if exists items_public_postal_area;

alter table public.items
add constraint items_public_postal_area
check (postal_code is null or postal_code ~ '^[0-9]{3}00$');

-- Media is private at the bucket level. Downloads must pass the policies below,
-- so hidden, blocked, deleted or moderated content cannot be fetched by a known URL.
update storage.buckets
set public = false
where id in ('item-photos', 'profile-avatars');

drop policy if exists "item photos are publicly readable" on storage.objects;
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
        or public.is_admin()
      )
  )
);

drop policy if exists "profile avatars are publicly readable" on storage.objects;
drop policy if exists "profile avatars readable with profile" on storage.objects;
create policy "profile avatars readable with profile"
on storage.objects for select
using (
  bucket_id = 'profile-avatars'
  and exists (
    select 1
    from public.profiles profile
    where profile.id::text = (storage.foldername(name))[1]
      and (
        not profile.is_banned
        or profile.id = auth.uid()
        or public.is_admin()
      )
  )
);
