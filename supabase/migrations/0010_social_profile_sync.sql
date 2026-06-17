-- Sync profile basics from OAuth providers.
-- This keeps social login profile setup separate from trade rules:
-- no payment, shipping, delivery, or money fields are introduced.

create or replace function public.get_auth_display_name(user_email text, metadata jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(metadata ->> 'display_name'), ''),
    nullif(trim(metadata ->> 'full_name'), ''),
    nullif(trim(metadata ->> 'name'), ''),
    nullif(trim(metadata ->> 'user_name'), ''),
    nullif(trim(metadata ->> 'preferred_username'), ''),
    nullif(trim(split_part(coalesce(user_email, ''), '@', 1)), ''),
    'Usuario Trueka'
  );
$$;

create or replace function public.get_auth_avatar_url(metadata jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(metadata ->> 'avatar_url'), ''),
    nullif(trim(metadata ->> 'picture'), ''),
    nullif(trim(metadata ->> 'photo_url'), ''),
    nullif(trim(metadata ->> 'profile_image_url'), '')
  );
$$;

create or replace function public.get_auth_email_verified(email_confirmed_at timestamptz, metadata jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(email_confirmed_at is not null, false)
    or lower(coalesce(metadata ->> 'email_verified', 'false')) in ('true', 't', '1', 'yes', 'y', 'si', 'sí');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    avatar_url,
    email_verified
  )
  values (
    new.id,
    public.get_auth_display_name(new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb)),
    public.get_auth_avatar_url(coalesce(new.raw_user_meta_data, '{}'::jsonb)),
    public.get_auth_email_verified(new.email_confirmed_at, coalesce(new.raw_user_meta_data, '{}'::jsonb))
  )
  on conflict (id) do update
  set
    display_name = case
      when trim(coalesce(public.profiles.display_name, '')) = ''
        or public.profiles.display_name = split_part(coalesce(new.email, ''), '@', 1)
        or public.profiles.display_name = 'Usuario Trueka'
        then excluded.display_name
      else public.profiles.display_name
    end,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    email_verified = public.profiles.email_verified or excluded.email_verified;

  return new;
end;
$$;

create or replace function public.sync_current_user_profile_from_auth()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users%rowtype;
  v_display_name text;
  v_avatar_url text;
  v_email_verified boolean;
begin
  if auth.uid() is null then
    return;
  end if;

  select * into v_user
  from auth.users
  where id = auth.uid();

  if not found then
    return;
  end if;

  v_display_name := public.get_auth_display_name(v_user.email, coalesce(v_user.raw_user_meta_data, '{}'::jsonb));
  v_avatar_url := public.get_auth_avatar_url(coalesce(v_user.raw_user_meta_data, '{}'::jsonb));
  v_email_verified := public.get_auth_email_verified(v_user.email_confirmed_at, coalesce(v_user.raw_user_meta_data, '{}'::jsonb));

  insert into public.profiles (
    id,
    display_name,
    avatar_url,
    email_verified
  )
  values (
    v_user.id,
    v_display_name,
    v_avatar_url,
    v_email_verified
  )
  on conflict (id) do update
  set
    display_name = case
      when trim(coalesce(public.profiles.display_name, '')) = ''
        or public.profiles.display_name = split_part(coalesce(v_user.email, ''), '@', 1)
        or public.profiles.display_name = 'Usuario Trueka'
        then excluded.display_name
      else public.profiles.display_name
    end,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    email_verified = public.profiles.email_verified or excluded.email_verified;
end;
$$;
