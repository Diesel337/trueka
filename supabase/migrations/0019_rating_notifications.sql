-- Notify users when they receive a rating after a completed trade.
-- This keeps reputation visible without adding payments, money, shipping, delivery, or escrow.

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check check (
  type in (
    'trade_request_received',
    'trade_request_accepted',
    'trade_request_rejected',
    'trade_request_cancelled',
    'message_received',
    'trade_completion_confirmed',
    'trade_completed',
    'item_interest_match',
    'item_view_summary',
    'rating_received'
  )
);

create or replace function public.notify_rating_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer_name text;
begin
  select display_name into v_reviewer_name
  from public.profiles
  where id = new.reviewer_id;

  perform public.insert_notification(
    new.reviewed_id,
    new.reviewer_id,
    'rating_received',
    'Nueva reseña recibida',
    coalesce(v_reviewer_name, 'La otra persona') || ' te calificó con ' || new.rating::text || ' de 5.',
    '/profile',
    new.trade_request_id,
    null
  );

  return new;
end;
$$;

drop trigger if exists ratings_notify_created on public.ratings;
create trigger ratings_notify_created
after insert on public.ratings
for each row execute function public.notify_rating_created();
