-- Restore authenticated profile writes after private columns were removed from
-- direct PostgREST selects. These functions expose only the intended mutations
-- and keep trust, moderation, reputation and private metadata server-controlled.

create or replace function public.update_my_profile(
  p_display_name text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_bio text,
  p_avatar_url text,
  p_complete_onboarding boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_avatar_url text := nullif(trim(p_avatar_url), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_display_name, ''))) not between 2 and 80 then
    raise exception 'Invalid display name.' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_city, ''))) not between 2 and 80 then
    raise exception 'Invalid city.' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_state, ''))) not between 2 and 80 then
    raise exception 'Invalid state.' using errcode = '22023';
  end if;

  if nullif(trim(p_postal_code), '') is not null
    and trim(p_postal_code) !~ '^[0-9]{5}$'
  then
    raise exception 'Invalid postal code.' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_bio, ''))) > 240 then
    raise exception 'Invalid bio.' using errcode = '22023';
  end if;

  if v_avatar_url is not null
    and v_avatar_url not like (
      '/api/media/profile-avatars/' || v_user_id::text || '/%'
    )
  then
    raise exception 'Invalid profile avatar.' using errcode = '22023';
  end if;

  update public.profiles
  set
    display_name = trim(p_display_name),
    city = trim(p_city),
    state = trim(p_state),
    postal_code = nullif(trim(p_postal_code), ''),
    bio = nullif(trim(p_bio), ''),
    avatar_url = coalesce(v_avatar_url, avatar_url),
    onboarding_completed_at = case
      when coalesce(p_complete_onboarding, false)
        then coalesce(onboarding_completed_at, now())
      else onboarding_completed_at
    end
  where id = v_user_id
    and not is_banned;

  if not found then
    raise exception 'Profile unavailable.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.sync_my_phone_verification()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_user auth.users%rowtype;
  v_phone_candidate text;
  v_phone_digits text;
  v_phone_last4 text;
  v_phone_pending boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select *
  into v_auth_user
  from auth.users
  where id = v_user_id;

  if not found then
    raise exception 'Auth user unavailable.' using errcode = '42501';
  end if;

  v_phone_candidate := coalesce(
    nullif(v_auth_user.phone_change, ''),
    nullif(v_auth_user.phone, '')
  );
  v_phone_digits := regexp_replace(coalesce(v_phone_candidate, ''), '[^0-9]', '', 'g');
  v_phone_last4 := case
    when char_length(v_phone_digits) >= 4 then right(v_phone_digits, 4)
    else null
  end;
  v_phone_pending := nullif(v_auth_user.phone_change, '') is not null
    or v_auth_user.phone_confirmed_at is null;

  if v_phone_last4 is null then
    raise exception 'Auth phone unavailable.' using errcode = '22023';
  end if;

  if v_phone_pending then
    update public.profiles
    set
      phone_verified = false,
      phone_last4 = v_phone_last4,
      phone_verified_at = null,
      phone_verification_started_at = now()
    where id = v_user_id
      and not is_banned;
  else
    update public.profiles
    set
      phone_verified = true,
      phone_last4 = v_phone_last4,
      phone_verified_at = case
        when phone_verified
          and phone_last4 is not distinct from v_phone_last4
          and phone_verified_at is not null
          then phone_verified_at
        else now()
      end,
      phone_verification_started_at = coalesce(
        phone_verification_started_at,
        now()
      )
    where id = v_user_id
      and not is_banned;
  end if;

  if not found then
    raise exception 'Profile unavailable.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.sync_my_email_verification()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_user auth.users%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select *
  into v_auth_user
  from auth.users
  where id = v_user_id;

  if not found then
    raise exception 'Auth user unavailable.' using errcode = '42501';
  end if;

  if not public.get_auth_email_verified(
    v_auth_user.email_confirmed_at,
    coalesce(v_auth_user.raw_user_meta_data, '{}'::jsonb)
  )
  then
    raise exception 'Email is not verified.' using errcode = '42501';
  end if;

  update public.profiles
  set email_verified = true
  where id = v_user_id
    and not is_banned;

  if not found then
    raise exception 'Profile unavailable.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.update_my_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) from public;
revoke all on function public.update_my_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) from anon;
grant execute on function public.update_my_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) to authenticated;

revoke all on function public.sync_my_phone_verification() from public;
revoke all on function public.sync_my_phone_verification() from anon;
grant execute on function public.sync_my_phone_verification() to authenticated;

revoke all on function public.sync_my_email_verification() from public;
revoke all on function public.sync_my_email_verification() from anon;
grant execute on function public.sync_my_email_verification() to authenticated;

