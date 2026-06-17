-- Phone verification support.
-- This adds trust metadata only. It does not add payments, money fields,
-- managed shipping, managed delivery, or escrow.

alter table public.profiles
add column if not exists phone_last4 text check (phone_last4 is null or phone_last4 ~ '^[0-9]{4}$'),
add column if not exists phone_verified_at timestamptz,
add column if not exists phone_verification_started_at timestamptz;

-- Any previous phone flag came from placeholder product UI, not a real OTP flow.
-- Keep Trueka honest: only profiles confirmed after this migration should show
-- phone verification.
update public.profiles
set
  phone_verified = false,
  phone_last4 = null,
  phone_verified_at = null,
  phone_verification_started_at = null
where phone_verified = true
  and phone_verified_at is null;
